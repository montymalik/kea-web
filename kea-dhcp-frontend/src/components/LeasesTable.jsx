// LeasesTable.jsx - Added numerical sorting by IP address
import React, { useMemo } from 'react';
import { formatExpiration, formatMacAddress } from '../utils/utils';

const LeasesTable = ({ leases, onDeleteLease }) => {
  console.log('LeasesTable received leases prop:', leases);
  console.log('LeasesTable received leases.length:', leases ? leases.length : 'null/undefined');
  console.log('LeasesTable leases type:', typeof leases);
  console.log('LeasesTable leases is Array:', Array.isArray(leases));
  
  if (leases && leases.length > 0) {
    console.log('LeasesTable first 3 leases:', leases.slice(0, 3));
  }

  // Helper function to convert IP address to number for sorting
  const ipToNumber = (ip) => {
    if (!ip) return 0;
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  // Sort leases by IP address numerically
  const sortedLeases = useMemo(() => {
    if (!leases || !Array.isArray(leases)) {
      return [];
    }
    
    return [...leases].sort((a, b) => {
      const ipA = ipToNumber(a.ip_address);
      const ipB = ipToNumber(b.ip_address);
      return ipA - ipB;
    });
  }, [leases]);

  if (!leases) {
    console.log('LeasesTable: leases is null/undefined');
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <p className="text-gray-600">No leases data received.</p>
      </div>
    );
  }

  if (!Array.isArray(leases)) {
    console.log('LeasesTable: leases is not an array:', typeof leases);
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <p className="text-gray-600">Invalid leases data format.</p>
      </div>
    );
  }

  if (leases.length === 0) {
    console.log('LeasesTable: leases array is empty');
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <p className="text-gray-600">No active leases found.</p>
      </div>
    );
  }

  console.log('LeasesTable: Rendering table with', sortedLeases.length, 'sorted leases');

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Address
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              MAC Address
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hostname
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subnet ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expires In
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedLeases.map((lease, index) => {
            // Debug each lease
            console.log(`Processing lease ${index}:`, lease);
            
            // Sanity check: Ensure lease is not undefined/null before proceeding
            if (!lease) {
              console.warn(`LeasesTable: Found an undefined or null lease object at index ${index}. Skipping.`);
              return null; // Skip rendering this row if the lease object is invalid
            }

            // Determine a robust key
            const rowKey = lease.ip_address || `lease-${index}`; // Use ip_address if available, otherwise fallback to index

            // Determine status styling
            const statusColor = lease.status === 'Active' ? 'text-green-800 bg-green-100' : 'text-gray-800 bg-gray-100';

            console.log(`Rendering lease row ${index} with key ${rowKey}`);

            return (
              <tr key={rowKey}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {lease.ip_address || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatMacAddress(lease.mac_address)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lease.hostname || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lease.subnet_id || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                    {lease.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatExpiration(lease)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onDeleteLease(lease.ip_address)}
                    className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeasesTable;
