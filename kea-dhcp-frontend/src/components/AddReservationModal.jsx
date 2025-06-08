// AddReservationModal.jsx - Add Reservation Modal Component
import React from 'react';

const AddReservationModal = ({ 
  show, 
  onClose, 
  newReservation, 
  setNewReservation, 
  subnets, 
  onSubmit, 
  onGetNextAvailableIP 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Reservation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAC Address
            </label>
            <input
              type="text"
              required
              placeholder="aa:bb:cc:dd:ee:ff"
              value={newReservation.dhcp_identifier}
              onChange={(e) => setNewReservation({...newReservation, dhcp_identifier: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                required
                placeholder="192.168.1.100"
                value={newReservation.ipv4_address}
                onChange={(e) => setNewReservation({...newReservation, ipv4_address: e.target.value})}
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
              Subnet ID
            </label>
            <select
              required
              value={newReservation.subnet_id}
              onChange={(e) => setNewReservation({...newReservation, subnet_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Subnet</option>
              {subnets.map(subnet => (
                <option key={subnet.subnet_id} value={subnet.subnet_id}>
                  {subnet.subnet_id} - {subnet.subnet_prefix}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostname (Optional)
            </label>
            <input
              type="text"
              placeholder="hostname"
              value={newReservation.hostname}
              onChange={(e) => setNewReservation({...newReservation, hostname: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Reservation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddReservationModal;
