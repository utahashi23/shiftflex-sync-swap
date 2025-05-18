
import React from 'react';

interface DashboardDebugProps {
  isVisible: boolean;
}

const DashboardDebug: React.FC<DashboardDebugProps> = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-8 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Debug Information</h3>
      <div className="text-xs text-gray-400">
        Dashboard debug panel - only visible in development
      </div>
    </div>
  );
};

export default DashboardDebug;
