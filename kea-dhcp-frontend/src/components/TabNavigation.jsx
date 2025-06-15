// TabNavigation.jsx - Updated Tab Navigation Component with Static IPs
import React from 'react';
import { Monitor, Network, Server } from 'lucide-react';

const TabNavigation = ({ 
  activeTab, 
  setActiveTab, 
  leasesCount, 
  reservationsCount, 
  staticIPsCount 
}) => {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => setActiveTab('leases')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'leases'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Monitor className="h-4 w-4" />
            <span>Active Leases ({leasesCount})</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('reservations')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'reservations'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Network className="h-4 w-4" />
            <span>Reservations ({reservationsCount})</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('static-ips')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'static-ips'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>Static IPs ({staticIPsCount})</span>
          </div>
        </button>
      </nav>
    </div>
  );
};

export default TabNavigation;
