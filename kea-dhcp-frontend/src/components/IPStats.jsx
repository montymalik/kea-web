// IPStats.jsx - IP Statistics Component with HA Status Monitoring
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import HAStatusIndicator from './HAStatusIndicator';

const IPStats = ({ ipStats, enrichedReservations, haStatus, onHAStatusClick }) => {
  // Calculate active vs reserved counts
  const activeReservations = enrichedReservations.filter(r => r.isActive).length;
  const inactiveReservations = enrichedReservations.filter(r => !r.isActive).length;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subnet 1 IP Status</h3>
          <p className="text-sm text-gray-600">
            Pool: {ipStats.poolInfo || 'Unknown'} ({ipStats.total} total IPs)
          </p>
        </div>
        
        <div className="flex space-x-8 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{ipStats.total}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-blue-600">{ipStats.reserved}</div>
            <div className="text-gray-500">Reserved</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{ipStats.available}</div>
            <div className="text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${
              ipStats.status === 'Low' ? 'text-red-600' : 
              ipStats.status === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {ipStats.status}
            </div>
            <div className="text-gray-500">Status</div>
          </div>
        </div>
      </div>
      
      {/* Lease Activity Summary with HA Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">System Status</h4>
          <div className="flex items-center space-x-6">
            {/* Reservation Activity */}
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">{activeReservations}</span>
                <span className="text-gray-500">Active</span>
              </div>
              <div className="flex items-center space-x-1">
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-600">{inactiveReservations}</span>
                <span className="text-gray-500">Reserved Only</span>
              </div>
            </div>
            
            {/* HA Status Indicator */}
            <div className="border-l border-gray-300 pl-4">
              <HAStatusIndicator 
                haStatus={haStatus} 
                onClick={onHAStatusClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPStats;
