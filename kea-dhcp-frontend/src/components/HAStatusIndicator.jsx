// HAStatusIndicator.jsx - HA Status Monitoring Component with Correct Color Mapping
import React from 'react';

const HAStatusIndicator = ({ haStatus, onClick }) => {
  if (!haStatus) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-3 w-3 rounded-full bg-gray-400"></div>
        <span className="text-xs text-gray-500">HA Status: Unknown</span>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'; // Green for hot-standby, load-balancing, backup
      case 'critical':
        return 'bg-red-500';   // Red for partner-down
      case 'warning':
        return 'bg-yellow-500'; // Yellow for any other state
      case 'info':
        return 'bg-yellow-500'; // Yellow for any other state
      default:
        return 'bg-gray-400';   // Gray for unknown
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'HA: Healthy';
      case 'critical':
        return 'HA: Critical';
      case 'warning':
        return 'HA: Warning';
      case 'info':
        return 'HA: Warning'; // Treat info as warning (yellow)
      default:
        return 'HA: Unknown';
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
      title={`Click for HA details - ${haStatus.overall?.message || 'No details available'}`}
    >
      <div className={`h-3 w-3 rounded-full ${getStatusColor(haStatus.overall?.status)} animate-pulse`}></div>
      <span className="text-xs text-gray-600">
        {getStatusText(haStatus.overall?.status)}
      </span>
    </button>
  );
};

export default HAStatusIndicator;
