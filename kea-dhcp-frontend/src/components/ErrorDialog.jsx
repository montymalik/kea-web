// ErrorDialog.jsx - Enhanced error dialog component for better error display
import React from 'react';
import { X, AlertTriangle, Wifi, Server, AlertCircle } from 'lucide-react';

const ErrorDialog = ({ show, error, onClose, title = "Error" }) => {
  if (!show || !error) return null;

  // Parse different types of errors and format them appropriately
  const parseError = (errorMessage) => {
    // Check if it's a conflict error with structured information
    if (errorMessage.includes('already reserved in DHCP')) {
      return {
        type: 'dhcp_conflict',
        icon: <Wifi className="h-6 w-6 text-red-500" />,
        title: 'DHCP Reservation Conflict',
        message: errorMessage,
        color: 'red'
      };
    }
    
    if (errorMessage.includes('already assigned as a static IP')) {
      return {
        type: 'static_conflict',
        icon: <Server className="h-6 w-6 text-orange-500" />,
        title: 'Static IP Conflict',
        message: errorMessage,
        color: 'orange'
      };
    }
    
    if (errorMessage.includes('MAC address') && errorMessage.includes('already assigned')) {
      return {
        type: 'mac_conflict',
        icon: <AlertCircle className="h-6 w-6 text-yellow-500" />,
        title: 'MAC Address Conflict',
        message: errorMessage,
        color: 'yellow'
      };
    }
    
    // Default error type
    return {
      type: 'general',
      icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
      title: 'Error',
      message: errorMessage,
      color: 'red'
    };
  };

  const errorInfo = parseError(error);
  
  // Split message into lines for better formatting
  const messageLines = errorInfo.message.split('\n').filter(line => line.trim());

  const getColorClasses = (color) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
    }
  };

  const colors = getColorClasses(errorInfo.color);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {errorInfo.icon}
            <h3 className="text-lg font-medium text-gray-900">{errorInfo.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
            <div className={`${colors.text} space-y-2`}>
              {messageLines.map((line, index) => {
                // Format different types of lines
                if (line.startsWith('•')) {
                  return (
                    <div key={index} className="flex items-start space-x-2 ml-4">
                      <span className="text-sm font-medium mt-0.5">•</span>
                      <span className="text-sm">{line.substring(1).trim()}</span>
                    </div>
                  );
                } else if (/^\d+\./.test(line)) {
                  return (
                    <div key={index} className="flex items-start space-x-2 ml-4">
                      <span className="text-sm font-medium">{line.split('.')[0]}.</span>
                      <span className="text-sm">{line.substring(line.indexOf('.') + 1).trim()}</span>
                    </div>
                  );
                } else if (line.includes(':') && !line.includes('://')) {
                  // Likely a key-value pair like "IP: 192.168.1.6"
                  const [key, ...valueParts] = line.split(':');
                  return (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{key}:</span>
                      <span className="ml-1">{valueParts.join(':').trim()}</span>
                    </div>
                  );
                } else {
                  return (
                    <p key={index} className={`text-sm ${line.trim() && !line.startsWith('•') && !line.match(/^\d+\./) ? 'font-medium' : ''}`}>
                      {line}
                    </p>
                  );
                }
              })}
            </div>
          </div>

          {/* Helpful tips based on error type */}
          {errorInfo.type === 'dhcp_conflict' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Quick Solutions:</h4>
                  <ul className="text-xs text-blue-800 mt-1 space-y-1">
                    <li>• Go to the "Reservations" tab and remove the conflicting reservation</li>
                    <li>• Choose an IP address outside the reservation pool (192.168.1.2-100)</li>
                    <li>• Use an IP from the static range if you have one configured</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {errorInfo.type === 'static_conflict' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Quick Solutions:</h4>
                  <ul className="text-xs text-blue-800 mt-1 space-y-1">
                    <li>• Edit the existing static IP assignment instead</li>
                    <li>• Choose a different IP address</li>
                    <li>• Delete the existing assignment if it's no longer needed</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${colors.button} text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
