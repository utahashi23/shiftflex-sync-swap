
import { SwapMatch } from "./types";
import { getShiftType } from "@/utils/shiftUtils";
import { formatTime } from "@/utils/dateUtils";

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const getShiftTypeLabel = (type: string) => {
  switch (type) {
    case 'day':
      return 'Day Shift';
    case 'afternoon':
      return 'Afternoon Shift';
    case 'night':
      return 'Night Shift';
    default:
      return 'Unknown Shift';
  }
};

export const getColleagueName = (profilesMap: Record<string, any>, userId: string) => {
  if (!userId || !profilesMap[userId]) return 'Unknown';
  return `${profilesMap[userId].first_name || ''} ${profilesMap[userId].last_name || ''}`.trim() || 'Unknown';
};

// Update the shared getShiftType function to make it consistent across the application
export const getCorrectShiftType = (startTime: string): "day" | "afternoon" | "night" => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour <= 8) {
    return 'day';
  } else if (hour > 8 && hour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
};

// This function is kept for backward compatibility but is not used in the new implementation
export const processSwapRequests = (
  requests: any[], 
  shifts: any[], 
  currentUserId: string,
  profilesMap: Record<string, any>
): SwapMatch[] => {
  return [];
};
