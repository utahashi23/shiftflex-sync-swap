
import React from "react";

interface SwapStatusBadgeProps {
  status: string;
}

export const SwapStatusBadge = ({ status }: SwapStatusBadgeProps) => {
  // Determine status display text and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          colorClass: 'bg-amber-100 text-amber-800'
        };
      case 'accepted':
        return {
          text: 'Accepted',
          colorClass: 'bg-blue-100 text-blue-800'
        };
      case 'other_accepted':
        return {
          text: 'Accepted by Another User',
          colorClass: 'bg-gray-100 text-gray-800'
        };
      case 'completed':
        return {
          text: 'Completed',
          colorClass: 'bg-green-100 text-green-800'
        };
      default:
        // Safely handle the case when status doesn't match any of our defined types
        return {
          text: typeof status === 'string' ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown',
          colorClass: 'bg-gray-100 text-gray-800'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusDisplay.colorClass}`}>
      {statusDisplay.text}
    </span>
  );
};
