// StaticIPTable.jsx - Table for displaying static IPs assigned outside DHCP
import React, { useMemo } from 'react';
import { formatMacAddress } from '../utils/utils';
import { Server, Edit, Trash2 } from 'lucide-react';

const StaticIPTable = ({ staticIPs, onOpenDetails, onEdit, onDelete }) => {
  // Helper function to convert IP address to number for sorting
  const ipToNumber = (ip) => {
    if (!ip) return 0;
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  // Sort static IPs by IP address numerically
  const sortedStaticIPs = useMemo(() => {
    if (!staticIPs || !Array.isArray(staticIPs)) {
      return [];
    }
    
    return [...staticIPs].sort((a, b) => {
      const ipA = ipToNumber(a.ip_address);
      const ipB = ipToNumber(b.ip_address);
      return ipA - ipB;
    });
  }, [staticIPs]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MAC Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hostname
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStaticIPs.map((staticIP) => (
              <tr key={staticIP.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4 text-blue-500" />
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Static
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <button
                    onClick={() => onOpenDetails(staticIP)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {staticIP.ip_address}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {formatMacAddress(staticIP.mac_address)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {staticIP.hostname || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {staticIP.description || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button
                    onClick={() => onEdit(staticIP)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(staticIP)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedStaticIPs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No static IP assignments found
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticIPTable;

