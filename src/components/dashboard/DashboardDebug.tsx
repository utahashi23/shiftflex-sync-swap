
import React from 'react';

interface DashboardDebugProps {
  isVisible: boolean;
  data?: Record<string, any>;
}

const DashboardDebug: React.FC<DashboardDebugProps> = ({ isVisible, data }) => {
  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-8 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Debug Information</h3>
      <div className="text-xs text-gray-400">
        {data ? (
          <pre className="overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          "Dashboard debug panel - only visible in development"
        )}
      </div>
    </div>
  );
};

export default React.memo(DashboardDebug);
