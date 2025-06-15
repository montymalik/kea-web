// IPStats.jsx - Updated IP Statistics Component with Static IP Support
import React from 'react';
import { Wifi, WifiOff, Server } from 'lucide-react';
import HAStatusIndicator from './HAStatusIndicator';

const IPStats = ({ ipStats, enrichedReservations, staticIPs = [], haStatus, onHAStatusClick }) => {
  // Calculate active vs reserved counts
  const activeReservations = enrichedReservations.filter(r => r.isActive).length;
  const inactiveReservations = enrichedReservations.filter(r => !r.isActive).length;
  const staticIPsCount = staticIPs.length;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subnet 1 IP Pool Status</h3>
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
            <div className="font-semibold text-purple-600">{ipStats.static}</div>
            <div className="text-gray-500">Static</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-600">{ipStats.totalUsed}</div>
            <div className="text-gray-500">Used</div>
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
      
      {/* IP Assignment Activity Summary with HA Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">IP Assignment Breakdown</h4>
          <div className="flex items-center space-x-6">
            {/* IP Assignment Activity */}
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">{activeReservations}</span>
                <span className="text-gray-500">Active DHCP</span>
              </div>
              <div className="flex items-center space-x-1">
                <WifiOff className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-600">{inactiveReservations}</span>
                <span className="text-gray-500">Reserved Only</span>
              </div>
              <div className="flex items-center space-x-1">
                <Server className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-600">{staticIPsCount}</span>
                <span className="text-gray-500">Static Manual</span>
              </div>
            </div>
            
            {/* HA Status Indicator - Only show if HA is configured */}
            {haStatus && haStatus.configured !== false && (
              <div className="border-l border-gray-300 pl-4">
                <HAStatusIndicator 
                  haStatus={haStatus} 
                  onClick={onHAStatusClick}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Additional information about static IPs */}
        {staticIPsCount > 0 && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Server className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-800 font-medium">
                {staticIPsCount} IP{staticIPsCount !== 1 ? 's' : ''} manually assigned outside DHCP
              </span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              These IPs are excluded from the DHCP reservation pool to prevent conflicts
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IPStats;
