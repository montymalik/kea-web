// ConfirmationModals.jsx - Delete and Modify Confirmation Modals
import React from 'react';

export const DeleteConfirmationModal = ({ show, reservation, onConfirm, onCancel }) => {
  if (!show || !reservation) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete the reservation for <strong>{reservation.ip_address}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export const ModifyConfirmationModal = ({ show, originalData, modifyData, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Changes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please review the changes below and confirm:
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="font-medium text-gray-700">Field</div>
            <div className="font-medium text-gray-700">Current</div>
            <div className="font-medium text-gray-700">New</div>
            
            <div className="text-gray-600">MAC Address</div>
            <div className="font-mono text-xs">{originalData.dhcp_identifier}</div>
            <div className={`font-mono text-xs ${originalData.dhcp_identifier !== modifyData.dhcp_identifier ? 'text-blue-600 font-medium' : ''}`}>
              {modifyData.dhcp_identifier}
            </div>
            
            <div className="text-gray-600">IP Address</div>
            <div className="font-mono text-xs">{originalData.ipv4_address}</div>
            <div className={`font-mono text-xs ${originalData.ipv4_address !== modifyData.ipv4_address ? 'text-blue-600 font-medium' : ''}`}>
              {modifyData.ipv4_address}
            </div>
            
            <div className="text-gray-600">Subnet ID</div>
            <div>{originalData.subnet_id}</div>
            <div className={originalData.subnet_id !== modifyData.subnet_id ? 'text-blue-600 font-medium' : ''}>
              {modifyData.subnet_id}
            </div>
            
            <div className="text-gray-600">Hostname</div>
            <div>{originalData.hostname || 'N/A'}</div>
            <div className={originalData.hostname !== modifyData.hostname ? 'text-blue-600 font-medium' : ''}>
              {modifyData.hostname || 'N/A'}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Confirm Changes
          </button>
        </div>
      </div>
    </div>
  );
};
