// SearchBar.jsx - Search Bar Component
import React from 'react';
import { Search, Plus } from 'lucide-react';

const SearchBar = ({ searchTerm, setSearchTerm, activeTab, onAddReservation }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search by IP, hostname, or MAC address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
        />
      </div>
      
      {activeTab === 'reservations' && (
        <button
          onClick={onAddReservation}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reservation</span>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
