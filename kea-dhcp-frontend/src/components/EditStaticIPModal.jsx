// EditStaticIPModal.jsx - Modal for editing static IP assignments
import React from 'react';
import { X, Save } from 'lucide-react';

const EditStaticIPModal = ({ 
  show, 
  editStaticIP, 
  setEditStaticIP, 
  onClose, 
  onSubmit 
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!editStaticIP.ip_address.trim()) {
      alert('IP address is required');
      return;
    }
    
    // Call the submit function
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Static IP Assignment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address *
              </label>
              <input
                type="text"
                required
                value={editStaticIP.ip_address}
                onChange={(e) => setEditStaticIP({...editStaticIP, ip_address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="192.168.1.50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Be careful when changing IP addresses - ensure the device is reconfigured
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address
              </label>
              <input
                type="text"
                placeholder="aa:bb:cc:dd:ee:ff (optional)"
                value={editStaticIP.mac_address}
                onChange={(e) => setEditStaticIP({...editStaticIP, mac_address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Use format AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hostname
              </label>
              <input
                type="text"
                placeholder="server01"
                value={editStaticIP.hostname}
                onChange={(e) => setEditStaticIP({...editStaticIP, hostname: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Friendly name for this device
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows="2"
                placeholder="Web server, Database server, etc."
                value={editStaticIP.description}
                onChange={(e) => setEditStaticIP({...editStaticIP, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Purpose or role of this device
              </p>
            </div>
          </div>

          {/* Warning notice */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  Changes here only update documentation. You must manually reconfigure the actual device with any IP address changes.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaticIPModal;
