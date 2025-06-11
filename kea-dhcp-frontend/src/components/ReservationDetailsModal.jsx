// ReservationDetailsModal.jsx - Fixed to properly show lease expiration data
import React from 'react';
import { X, Wifi, WifiOff, Clock } from 'lucide-react';
import { formatExpiration, formatMacAddress } from '../utils/utils';

const ReservationDetailsModal = ({ show, reservation, onClose, onDelete, onModify }) => {
  if (!show || !reservation) return null;

  // Check if there's an active lease for this reservation
  const hasActiveLease = reservation.isActive && reservation.leaseInfo;
  
  // Format expiration time and date for active leases
  let formattedExpiration = 'N/A';
  let expiresAtDate = 'N/A';
  
  if (hasActiveLease && reservation.leaseInfo) {
    const lease = reservation.leaseInfo;
    
    // Format the relative expiration time (e.g., "2h 30m")
    formattedExpiration = formatExpiration(lease);
    
    // Calculate the actual expiration date/time
    const cltt = lease.cltt || lease['cltt'];
    const validLft = lease['valid-lft'] || lease.valid_lft;
    
    if (cltt && validLft) {
      const expirationTimestamp = (parseInt(cltt) + parseInt(validLft)) * 1000; // Convert to milliseconds
      const expirationDate = new Date(expirationTimestamp);
      
      if (!isNaN(expirationDate.getTime())) {
        expiresAtDate = expirationDate.toLocaleString();
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reservation Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Lease Status Banner */}
          <div className={`p-4 rounded-lg ${hasActiveLease ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              {hasActiveLease ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-gray-500" />
              )}
              <span className={`font-medium ${hasActiveLease ? 'text-green-800' : 'text-gray-700'}`}>
                {hasActiveLease ? 'Active Lease' : 'Reserved Only'}
              </span>
            </div>
            {hasActiveLease && (
              <div className="flex items-center space-x-2 mt-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  Expires in: {formattedExpiration}
                </span>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">IP Address</label>
              <p className="mt-1 text-sm text-gray-900">{reservation.ip_address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">MAC Address</label>
              <p className="mt-1 text-sm text-gray-900">{formatMacAddress(reservation.mac_address)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subnet ID</label>
              <p className="mt-1 text-sm text-gray-900">{reservation.subnet_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Host ID</label>
              <p className="mt-1 text-sm text-gray-900">{reservation.host_id || 'N/A'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hostname</label>
            <p className="mt-1 text-sm text-gray-900">{reservation.hostname || 'N/A'}</p>
          </div>

          {/* Active Lease Information (only show if there's an active lease) */}
          {hasActiveLease && (
            <>
              <hr className="border-gray-200" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Active Lease Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lease Status</label>
                    <p className="mt-1 text-sm text-gray-900">Active</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expires At</label>
                    <p className="mt-1 text-sm text-gray-900">{expiresAtDate}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Lease Hostname</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {reservation.leaseInfo.hostname || 'N/A'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            🗑️ Delete
          </button>
          <button
            onClick={onModify}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            ✏️ Modify
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailsModal;
