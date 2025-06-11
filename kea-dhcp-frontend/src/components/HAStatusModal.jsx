// HAStatusModal.jsx - Detailed HA Status Information Modal
import React from 'react';
import { X, Server, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const HAStatusModal = ({ show, haStatus, onClose, onRefresh }) => {
  if (!show) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Server className="h-5 w-5 text-gray-500" />;
    }
  };

  const getServerStatusColor = (serverStatus) => {
    if (!serverStatus.success) return 'text-red-600 bg-red-50 border-red-200';
    
    switch (serverStatus.state) {
      case 'load-balancing':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'partner-down':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hot-standby':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return 'N/A';
    try {
      return new Date(dateTimeStr).toLocaleString();
    } catch (error) {
      return dateTimeStr;
    }
  };

  const formatLastChecked = (lastChecked) => {
    if (!lastChecked) return 'Never';
    try {
      const date = new Date(lastChecked);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes === 1) return '1 minute ago';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      return date.toLocaleString();
    } catch (error) {
      return lastChecked;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Server className="h-6 w-6 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">HA Cluster Status</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              {getStatusIcon(haStatus?.overall?.status)}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  Overall Cluster Health
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {haStatus?.overall?.message || 'Status information unavailable'}
                </p>
                {haStatus?.overall?.details && (
                  <p className="text-xs text-gray-500 mt-2">
                    {haStatus.overall.details}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Last checked: {formatLastChecked(haStatus?.lastChecked)}
                </p>
              </div>
            </div>
          </div>

          {/* Server Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Server Status Details</h4>
            <div className="space-y-4">
              {haStatus?.servers && Object.entries(haStatus.servers).map(([serverName, serverStatus]) => (
                <div key={serverName} className={`border rounded-lg p-4 ${getServerStatusColor(serverStatus)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium">{serverName}</h5>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      serverStatus.success ? 'bg-white' : 'bg-red-100 text-red-800'
                    }`}>
                      {serverStatus.success ? serverStatus.state || 'Unknown State' : 'Unreachable'}
                    </span>
                  </div>

                  {serverStatus.success ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">State:</span>
                        <p>{serverStatus.state}</p>
                      </div>
                      <div>
                        <span className="font-medium">Server Time:</span>
                        <p>{formatDateTime(serverStatus.dateTime)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Scopes:</span>
                        <p>{serverStatus.scopes ? serverStatus.scopes.join(', ') : 'None'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Unsent Updates:</span>
                        <p className={serverStatus.unsentUpdateCount > 0 ? 'text-yellow-700 font-medium' : ''}>
                          {serverStatus.unsentUpdateCount || 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="font-medium">Error:</span>
                      <p className="text-red-700">{serverStatus.error || 'Communication failed'}</p>
                    </div>
                  )}

                  <div className="mt-2 text-xs opacity-75">
                    Last checked: {formatLastChecked(serverStatus.lastChecked)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HA State Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">HA State Reference</h5>
            <div className="text-xs text-blue-800 space-y-1">
              <div><strong>load-balancing:</strong> Both servers operational, sharing DHCP load</div>
              <div><strong>partner-down:</strong> One server detected partner failure, serving all requests</div>
              <div><strong>hot-standby:</strong> Primary-backup mode, one server active</div>
              <div><strong>syncing:</strong> Servers synchronizing lease databases</div>
              <div><strong>Unsent Updates:</strong> Non-zero values may indicate synchronization lag</div>
            </div>
          </div>

          {/* Error Information */}
          {haStatus?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-red-900 mb-2">Error Details</h5>
              <p className="text-sm text-red-800">{haStatus.error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Refresh Status
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HAStatusModal;
