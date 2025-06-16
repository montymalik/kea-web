// PoolConfigModal.jsx - Modal for configuring reservation pool settings
import React, { useState, useEffect } from 'react';
import { X, Settings, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PoolConfigModal = ({ show, poolConfig, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    start_ip: '',
    end_ip: '',
    description: ''
  });
  const [validation, setValidation] = useState({
    isValid: true,
    poolSize: 0,
    conflicts: [],
    message: ''
  });
  const [isValidating, setIsValidating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when modal opens or poolConfig changes
  useEffect(() => {
    if (show && poolConfig) {
      setFormData({
        start_ip: poolConfig.start_ip || '',
        end_ip: poolConfig.end_ip || '',
        description: poolConfig.description || ''
      });
      setHasChanges(false);
    }
  }, [show, poolConfig]);

  // Validate IP address format
  const validateIPAddress = (ip) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet);
      return num >= 0 && num <= 255;
    });
  };

  // Calculate pool size
  const calculatePoolSize = (startIP, endIP) => {
    if (!validateIPAddress(startIP) || !validateIPAddress(endIP)) return 0;
    
    const ipToNumber = (ip) => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    };
    
    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);
    
    return Math.max(0, end - start + 1);
  };

  // Validate pool range with backend
  const validatePoolRange = async (startIP, endIP) => {
    if (!validateIPAddress(startIP) || !validateIPAddress(endIP)) {
      setValidation({
        isValid: false,
        poolSize: 0,
        conflicts: [],
        message: 'Invalid IP address format'
      });
      return;
    }

    const poolSize = calculatePoolSize(startIP, endIP);
    
    if (poolSize <= 0) {
      setValidation({
        isValid: false,
        poolSize: 0,
        conflicts: [],
        message: 'End IP must be greater than start IP'
      });
      return;
    }

    if (poolSize > 1000) {
      setValidation({
        isValid: false,
        poolSize: poolSize,
        conflicts: [],
        message: 'Pool size cannot exceed 1000 IPs'
      });
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch(`/api/pool-config/validate?start_ip=${startIP}&end_ip=${endIP}`);
      const data = await response.json();
      
      if (data.success) {
        setValidation({
          isValid: data.valid,
          poolSize: data.poolSize,
          conflicts: data.conflicts || [],
          message: data.message
        });
      } else {
        setValidation({
          isValid: false,
          poolSize: poolSize,
          conflicts: [],
          message: data.error || 'Validation failed'
        });
      }
    } catch (error) {
      console.error('Error validating pool range:', error);
      setValidation({
        isValid: false,
        poolSize: poolSize,
        conflicts: [],
        message: 'Error validating pool range'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setHasChanges(true);

    // Validate when both IPs are present
    if (field === 'start_ip' || field === 'end_ip') {
      const startIP = field === 'start_ip' ? value : newFormData.start_ip;
      const endIP = field === 'end_ip' ? value : newFormData.end_ip;
      
      if (startIP && endIP) {
        // Debounce validation
        setTimeout(() => validatePoolRange(startIP, endIP), 500);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      alert('Please fix validation errors before saving');
      return;
    }
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving pool configuration:', error);
      alert(`Failed to save pool configuration: ${error.message}`);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Pool Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Reservation Pool</h4>
                <p className="text-sm text-blue-800 mt-1">
                  This defines the IP range available for DHCP reservations. It should be separate from your DHCP lease pool to avoid conflicts.
                </p>
              </div>
            </div>
          </div>

          {/* Start IP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start IP Address *
            </label>
            <input
              type="text"
              required
              placeholder="192.168.1.2"
              value={formData.start_ip}
              onChange={(e) => handleInputChange('start_ip', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* End IP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End IP Address *
            </label>
            <input
              type="text"
              required
              placeholder="192.168.1.100"
              value={formData.end_ip}
              onChange={(e) => handleInputChange('end_ip', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g., Server reservation pool"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Validation Status */}
          {formData.start_ip && formData.end_ip && (
            <div className={`rounded-lg p-4 ${
              isValidating ? 'bg-gray-50 border border-gray-200' :
              validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-2">
                {isValidating ? (
                  <div className="animate-spin h-5 w-5 text-gray-500 mt-0.5">⟳</div>
                ) : validation.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isValidating ? 'text-gray-700' :
                    validation.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {isValidating ? 'Validating...' : validation.message}
                  </p>
                  {validation.poolSize > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Pool size: {validation.poolSize} IP addresses
                    </p>
                  )}
                  {validation.conflicts.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-red-700 font-medium">Conflicting static IPs:</p>
                      <ul className="text-xs text-red-600 mt-1 space-y-1">
                        {validation.conflicts.map((conflict, index) => (
                          <li key={index} className="font-mono">
                            {conflict.ip_address} {conflict.hostname ? `(${conflict.hostname})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Configuration Display */}
          {poolConfig && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Range:</span>
                  <p className="font-mono">{poolConfig.start_ip} - {poolConfig.end_ip}</p>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <p>{poolConfig.total} IPs</p>
                </div>
              </div>
              {poolConfig.description && (
                <div className="mt-2">
                  <span className="text-gray-600">Description:</span>
                  <p>{poolConfig.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.isValid || !hasChanges || isValidating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PoolConfigModal;
