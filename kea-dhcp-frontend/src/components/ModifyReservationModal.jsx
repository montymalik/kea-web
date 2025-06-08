// ModifyReservationModal.jsx - Modify Reservation Modal Component
import React from 'react';
import { X, Check } from 'lucide-react';

const ModifyReservationModal = ({ 
  show, 
  modifyData, 
  setModifyData, 
  subnets, 
  onClose, 
  onSubmit 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Modify Reservation</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAC Address
            </label>
            <input
              type="text"
              value={modifyData.dhcp_identifier}
              onChange={(e) => setModifyData({...modifyData, dhcp_identifier: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={modifyData.ipv4_address}
              onChange={(e) => setModifyData({...modifyData, ipv4_address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subnet ID
            </label>
            <select
              value={modifyData.subnet_id}
              onChange={(e) => setModifyData({...modifyData, subnet_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {subnets.map(subnet => (
                <option key={subnet.subnet_id} value={subnet.subnet_id}>
                  {subnet.subnet_id} - {subnet.subnet_prefix}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostname
            </label>
            <input
              type="text"
              value={modifyData.hostname}
              onChange={(e) => setModifyData({...modifyData, hostname: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifyReservationModal;
