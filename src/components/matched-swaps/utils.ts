
import { format } from 'date-fns';
import { MatchedSwap, ShiftDetail } from './types';

/**
 * Format a date string to a more readable format
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'MMM dd, yyyy');
};

/**
 * Get a human-readable label for shift types
 */
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

/**
 * Process swap requests data into a format suitable for the UI
 */
export const processSwapRequests = (
  requests: any[],
  shifts: any[],
  currentUserId: string
): MatchedSwap[] => {
  return requests.map(request => {
    // Find the requester's shift
    const requesterShift = shifts.find(s => s.id === request.requester_shift_id);
    if (!requesterShift) return null;

    // Find the acceptor's shift
    const acceptorShift = shifts.find(s => s.id === request.acceptor_shift_id);
    if (!acceptorShift) return null;

    // Determine shift types based on start times
    const getShiftType = (startTime: string) => {
      const startHour = new Date(`2000-01-01T${startTime}`).getHours();
      if (startHour >= 0 && startHour < 8) return 'day';
      if (startHour >= 8 && startHour < 16) return 'afternoon';
      return 'night';
    };

    // Format original shift details
    const originalShiftDetail: ShiftDetail = {
      id: requesterShift.id,
      date: requesterShift.date,
      title: requesterShift.truck_name || `Shift-${requesterShift.id.substring(0, 5)}`,
      startTime: requesterShift.start_time.substring(0, 5),
      endTime: requesterShift.end_time.substring(0, 5),
      type: getShiftType(requesterShift.start_time),
      colleagueType: currentUserId === request.requester_id ? 'Your Shift' : 'Colleague Shift'
    };

    // Format matched shift details
    const matchedShiftDetail: ShiftDetail = {
      id: acceptorShift.id,
      date: acceptorShift.date,
      title: acceptorShift.truck_name || `Shift-${acceptorShift.id.substring(0, 5)}`,
      startTime: acceptorShift.start_time.substring(0, 5),
      endTime: acceptorShift.end_time.substring(0, 5),
      type: getShiftType(acceptorShift.start_time),
      colleagueType: currentUserId === request.acceptor_id ? 'Your Shift' : 'Colleague Shift'
    };

    // Add colleague names if available from profiles
    if (requesterShift.profiles) {
      const firstName = requesterShift.profiles.first_name || '';
      const lastName = requesterShift.profiles.last_name || '';
      originalShiftDetail.colleague = `${firstName} ${lastName}`.trim() || 'Unknown';
    }
    
    if (acceptorShift.profiles) {
      const firstName = acceptorShift.profiles.first_name || '';
      const lastName = acceptorShift.profiles.last_name || '';
      matchedShiftDetail.colleague = `${firstName} ${lastName}`.trim() || 'Unknown';
    }

    // Format the complete swap object
    return {
      id: request.id,
      originalShift: currentUserId === request.requester_id ? originalShiftDetail : matchedShiftDetail,
      matchedShift: currentUserId === request.requester_id ? matchedShiftDetail : originalShiftDetail,
      status: request.status
    };
  }).filter(Boolean) as MatchedSwap[];
};
