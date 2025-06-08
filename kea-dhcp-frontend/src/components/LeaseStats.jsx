// LeaseStats.jsx - Lease Statistics Component
import React from 'react';
import { Activity, Timer } from 'lucide-react';

const LeaseStats = ({ leaseStats, leases }) => {
  // Calculate lease status breakdown
  const activeLeases = leases.filter(lease => lease.status === 'Active').length;
  const expiredLeases = leases.filter(lease => lease.status !== 'Active').length;
  
  // Calculate expiring soon (within 24 hours)
  const now = new Date();
  const expiringSoon = leases.filter(lease => {
    const expireDate = new Date(lease.expires_at);
    const diffHours = (expireDate - now) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
  }).length;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subnet 1 Lease Status</h3>
          <p className="text-sm text-gray-600">Range: 192.168.1.1 - 192.168.1.200</p>
        </div>
        
        <div className="flex space-x-8 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{leaseStats.total}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-blue-600">{leaseStats.active}</div>
            <div className="text-gray-500">Active</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{leaseStats.available}</div>
            <div className="text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className={`font-semibold ${
              leaseStats.status === 'Low' ? 'text-red-600' : 
              leaseStats.status === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {leaseStats.status}
            </div>
            <div className="text-gray-500">Status</div>
          </div>
        </div>
      </div>
      
      {/* Lease Activity Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Lease Activity</h4>
          <div className="flex space-x-6 text-sm">
            <div className="flex items-center space-x-1">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-600">{activeLeases}</span>
              <span className="text-gray-500">Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-600">{expiringSoon}</span>
              <span className="text-gray-500">Expiring Soon</span>
            </div>
            {expiredLeases > 0 && (
              <div className="flex items-center space-x-1">
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
                <span className="font-medium text-red-600">{expiredLeases}</span>
                <span className="text-gray-500">Expired</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaseStats;
