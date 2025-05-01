
import { format } from 'date-fns';
import { MatchedSwap } from './types';

// Format date like "May 01, 2025"
export const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

// Get readable label for shift type
export const getShiftTypeLabel = (type: string) => {
  switch (type) {
    case 'day': return 'Day Shift';
    case 'afternoon': return 'Afternoon Shift';
    case 'night': return 'Night Shift';
    default: return 'Unknown';
  }
};

// Determine shift type from start time
export const getShiftType = (startTime: string): 'day' | 'afternoon' | 'night' => {
  try {
    const startHour = new Date(`2000-01-01T${startTime}`).getHours();
    
    if (startHour <= 8) {
      return 'day';
    } else if (startHour > 8 && startHour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  } catch (error) {
    console.error('Error determining shift type:', error);
    return 'day'; // Default to day shift if there's an error
  }
};

// Get a display name from a user profile
export const getUserDisplayName = (profile: any): string => {
  if (!profile) return 'Unknown User';
  
  // Skip admin user with this ID
  if (profile.id === '7c31ceb6-bec9-4ea8-b65a-b6629547b52e') return 'System';
  
  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  } else {
    return profile.email || 'Unknown User';
  }
};

// Process swap requests with shift data into the format expected by the UI
export const processSwapRequests = (
  requests: any[], 
  shifts: any[], 
  userId: string,
  profilesMap: Record<string, any>
): MatchedSwap[] => {
  return requests.map(request => {
    // Is the current user the requester or acceptor?
    const isRequester = request.requester_id === userId;
    
    // Get the shift details
    const userShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
    const otherShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
    const otherUserId = isRequester ? request.acceptor_id : request.requester_id;
    
    // Find the shifts in the shifts array
    const userShift = shifts.find(shift => shift.id === userShiftId);
    const otherShift = shifts.find(shift => shift.id === otherShiftId);
    
    if (!userShift || !otherShift) {
      console.error('Missing shift data for request:', request.id);
      return null;
    }
    
    // Get the profile for the other user
    const otherProfile = profilesMap[otherUserId] || {};
    const otherUserName = getUserDisplayName(otherProfile);
    
    // Format the shifts for display
    const originalShift = {
      id: userShift.id,
      date: userShift.date,
      title: userShift.truck_name || `Shift-${userShift.id.substring(0, 5)}`,
      startTime: userShift.start_time.substring(0, 5),
      endTime: userShift.end_time.substring(0, 5),
      type: getShiftType(userShift.start_time),
      colleagueType: 'Driver'
    };
    
    const matchedShift = {
      id: otherShift.id,
      date: otherShift.date,
      title: otherShift.truck_name || `Shift-${otherShift.id.substring(0, 5)}`,
      startTime: otherShift.start_time.substring(0, 5),
      endTime: otherShift.end_time.substring(0, 5),
      type: getShiftType(otherShift.start_time),
      colleagueType: 'Driver',
      colleague: otherUserName
    };
    
    return {
      id: request.id,
      originalShift,
      matchedShift,
      status: request.status
    };
  }).filter(Boolean) as MatchedSwap[];
};
