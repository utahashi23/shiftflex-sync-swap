
import { SwapMatch } from './types';

/**
 * Format the raw matches data from the API into the SwapMatch format used by the frontend
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  return matchesData.map(match => {
    // Determine the shift type based on the time
    const myShiftType = determineShiftType(match.my_shift_start_time);
    const otherShiftType = determineShiftType(match.other_shift_start_time);
    
    return {
      id: match.match_id,
      status: match.match_status,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: myShiftType,
        colleagueType: match.my_shift_colleague_type || 'Unknown',
        employeeId: match.my_employee_id
      },
      otherShift: {
        id: match.other_shift_id,
        date: match.other_shift_date,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck,
        type: otherShiftType,
        userId: match.other_user_id,
        userName: match.other_user_name || 'Unknown User',
        colleagueType: match.other_shift_colleague_type || 'Unknown',
        employeeId: match.other_employee_id
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      requesterId: match.requester_id,
      createdAt: match.created_at,
      // Add the new acceptance tracking fields
      hasAccepted: Boolean(match.has_accepted),
      otherHasAccepted: Boolean(match.other_has_accepted)
    };
  });
};

/**
 * Determine the shift type based on the start time
 */
const determineShiftType = (startTime: string): 'day' | 'afternoon' | 'night' | 'unknown' => {
  if (!startTime) return 'unknown';
  
  const hour = parseInt(startTime.split(':')[0], 10);
  
  if (hour >= 5 && hour < 12) {
    return 'day';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'night';
  }
};
