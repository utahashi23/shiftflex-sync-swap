
import { normalizeDate } from '@/utils/dateUtils';

/**
 * Determines shift type based on start time
 */
export const getShiftType = (startTime: string): "day" | "afternoon" | "night" => {
  // Handle cases where startTime might be undefined or not a proper time string
  if (!startTime) {
    console.warn('Invalid start time provided to getShiftType:', startTime);
    return 'day'; // Default to day shift in case of errors
  }

  try {
    const hour = parseInt(startTime.split(':')[0], 10);
    
    if (isNaN(hour)) {
      console.warn('Invalid hour parsed from startTime:', startTime);
      return 'day'; // Default to day shift in case of errors
    }
    
    if (hour <= 8) {
      return 'day';
    } else if (hour > 8 && hour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  } catch (error) {
    console.error('Error in getShiftType:', error);
    return 'day'; // Default to day shift in case of errors
  }
};

/**
 * Creates lookup maps for efficient matching
 */
export const createLookupMaps = (requests: any[], shifts: any[], preferredDates: any[]) => {
  const shiftsByDate: Record<string, any[]> = {};
  const shiftsByUser: Record<string, string[]> = {};
  const requestsByUser: Record<string, any[]> = {};
  const requestShifts: Record<string, any> = {};
  
  // Build shifts by date index
  shifts.forEach(shift => {
    const normalizedDate = normalizeDate(shift.date);
    if (!shiftsByDate[normalizedDate]) {
      shiftsByDate[normalizedDate] = [];
    }
    shiftsByDate[normalizedDate].push({
      ...shift,
      type: getShiftType(shift.start_time)
    });
    
    // Group shifts by user
    if (!shiftsByUser[shift.user_id]) {
      shiftsByUser[shift.user_id] = [];
    }
    shiftsByUser[shift.user_id].push(normalizedDate);
  });
  
  // Group requests by user
  requests.forEach(req => {
    if (!requestsByUser[req.requester_id]) {
      requestsByUser[req.requester_id] = [];
    }
    requestsByUser[req.requester_id].push(req);
    
    // Find the shift associated with this request
    const requestShift = shifts.find(s => s.id === req.requester_shift_id);
    if (requestShift) {
      requestShifts[req.id] = {
        ...requestShift,
        type: getShiftType(requestShift.start_time),
        normalizedDate: normalizeDate(requestShift.date)
      };
    }
  });
  
  // Group preferred dates by request
  const preferredDatesByRequest: Record<string, any[]> = {};
  preferredDates.forEach(pref => {
    if (!preferredDatesByRequest[pref.request_id]) {
      preferredDatesByRequest[pref.request_id] = [];
    }
    preferredDatesByRequest[pref.request_id].push({
      date: normalizeDate(pref.date),
      acceptedTypes: pref.accepted_types || []
    });
  });
  
  return {
    shiftsByDate,
    shiftsByUser,
    requestsByUser,
    requestShifts,
    preferredDatesByRequest
  };
};
