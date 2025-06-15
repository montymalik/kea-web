// AddStaticIPModal.jsx - Modal for adding new static IP assignments
import React from 'react';
import { X, Plus } from 'lucide-react';

const AddStaticIPModal = ({ 
  show, 
  onClose, 
  newStaticIP, 
  setNewStaticIP, 
  onSubmit, 
  onGetNextAvailableIP 
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newStaticIP.ip_address.trim()) {
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
          <h3 className="text-lg font-medium text-gray-900">Add Static IP Assignment</h3>
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
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="192.168.1.50"
                  value={newStaticIP.ip_address}
                  onChange={(e) => setNewStaticIP({...newStaticIP, ip_address: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={onGetNextAvailableIP}
                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  Next Available
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address
              </label>
              <input
                type="text"
                placeholder="aa:bb:cc:dd:ee:ff (optional)"
                value={newStaticIP.mac_address}
                onChange={(e) => setNewStaticIP({...newStaticIP, mac_address: e.target.value})}
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
                value={newStaticIP.hostname}
                onChange={(e) => setNewStaticIP({...newStaticIP, hostname: e.target.value})}
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
              <input
                type="text"
                placeholder="Web server, Database server, etc."
                value={newStaticIP.description}
                onChange={(e) => setNewStaticIP({...newStaticIP, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Purpose or role of this device
              </p>
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
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Add Static IP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaticIPModal;
