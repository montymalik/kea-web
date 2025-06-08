// Header.jsx - Header Component
import React from 'react';
import { Network, RefreshCw } from 'lucide-react';

const Header = ({ loading, onRefresh }) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-3">
            <Network className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Kea DHCP Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
