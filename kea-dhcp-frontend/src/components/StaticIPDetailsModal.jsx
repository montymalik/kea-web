// StaticIPDetailsModal.jsx - Modal for viewing static IP details
import React from 'react';
import { X, Server, Edit, Trash2 } from 'lucide-react';
import { formatMacAddress } from '../utils/utils';

const StaticIPDetailsModal = ({ show, staticIP, onClose, onEdit, onDelete }) => {
  if (!show || !staticIP) return null;

  const handleEdit = () => {
    onEdit(staticIP);
  };

  const handleDelete = () => {
    onDelete(staticIP);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Server className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Static IP Details</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                Static IP Assignment
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              This IP is manually assigned outside of DHCP and excluded from the reservation pool
            </p>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">IP Address</label>
              <p className="mt-1 text-sm text-gray-900 font-mono font-semibold">{staticIP.ip_address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">MAC Address</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {formatMacAddress(staticIP.mac_address) || 'Not specified'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hostname</label>
            <p className="mt-1 text-sm text-gray-900">{staticIP.hostname || 'Not specified'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-sm text-gray-900">{staticIP.description || 'No description provided'}</p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Added</label>
              <p className="mt-1 text-xs text-gray-500">
                {staticIP.created_at ? new Date(staticIP.created_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Modified</label>
              <p className="mt-1 text-xs text-gray-500">
                {staticIP.updated_at ? new Date(staticIP.updated_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Usage Notes</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• This IP is excluded from DHCP pool calculations</li>
              <li>• No DHCP reservations can be made for this address</li>
              <li>• The device should be configured with this static IP manually</li>
              <li>• Changes here only update documentation, not device configuration</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaticIPDetailsModal;
