// ReservationDetailsModal.jsx - Reservation Details Modal Component
import React from 'react';
import { X, Trash2, Edit, Wifi, WifiOff, Clock } from 'lucide-react';
import { formatExpiration } from '../utils/utils';

const ReservationDetailsModal = ({ 
  show, 
  reservation, 
  onClose, 
  onDelete, 
  onModify 
}) => {
  if (!show || !reservation) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Reservation Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Status Banner */}
        <div className={`rounded-lg p-3 mb-4 ${
          reservation.isActive 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            {reservation.isActive ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-800">Active Lease</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-700">Reserved (Not Active)</span>
              </>
            )}
          </div>
          {reservation.isActive && reservation.leaseInfo && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-green-700">
              <Clock className="h-4 w-4" />
              <span>Expires in: {formatExpiration(reservation.leaseInfo.expires_at)}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">IP Address</label>
              <p className="text-sm text-gray-900 font-mono">{reservation.ip_address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">MAC Address</label>
              <p className="text-sm text-gray-900 font-mono">{reservation.mac_address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Subnet ID</label>
              <p className="text-sm text-gray-900">{reservation.subnet_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Host ID</label>
              <p className="text-sm text-gray-900">{reservation.host_id}</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500">Hostname</label>
              <p className="text-sm text-gray-900">{reservation.hostname || 'N/A'}</p>
            </div>
          </div>

          {/* Lease Information Section */}
          {reservation.isActive && reservation.leaseInfo && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Active Lease Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Lease Status</label>
                  <p className="text-sm text-gray-900">{reservation.leaseInfo.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Expires At</label>
                  <p className="text-sm text-gray-900">
                    {new Date(reservation.leaseInfo.expires_at).toLocaleString()}
                  </p>
                </div>
                {reservation.leaseInfo.hostname && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Lease Hostname</label>
                    <p className="text-sm text-gray-900">{reservation.leaseInfo.hostname}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onDelete}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={onModify}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            <span>Modify</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailsModal;
