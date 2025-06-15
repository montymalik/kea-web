// SearchBar.jsx - Updated Search Bar Component with Static IP Support
import React from 'react';
import { Search, Plus, Server } from 'lucide-react';

const SearchBar = ({ 
  searchTerm, 
  setSearchTerm, 
  activeTab, 
  onAddReservation, 
  onAddStaticIP 
}) => {
  const getPlaceholderText = () => {
    switch (activeTab) {
      case 'static-ips':
        return 'Search static IPs by IP, hostname, MAC, or description...';
      default:
        return 'Search by IP, hostname, or MAC address...';
    }
  };

  const getAddButton = () => {
    if (activeTab === 'reservations') {
      return (
        <button
          onClick={onAddReservation}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reservation</span>
        </button>
      );
    }
    
    if (activeTab === 'static-ips') {
      return (
        <button
          onClick={onAddStaticIP}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Server className="h-4 w-4" />
          <span>Add Static IP</span>
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={getPlaceholderText()}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
        />
      </div>
      
      {getAddButton()}
    </div>
  );
};

export default SearchBar;
