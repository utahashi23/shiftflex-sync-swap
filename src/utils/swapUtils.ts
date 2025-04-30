
// Utility functions for swap requests

/**
 * Format date to short format (e.g., "Apr 29")
 */
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get badge color based on status
 */
export const getStatusBadgeColor = (status: 'pending' | 'accepted' | 'rejected' | 'cancelled'): string => {
  switch (status) {
    case 'pending': return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case 'accepted': return "bg-green-100 text-green-800 hover:bg-green-100";
    case 'rejected': return "bg-red-100 text-red-800 hover:bg-red-100";
    case 'cancelled': return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default: return "";
  }
};
