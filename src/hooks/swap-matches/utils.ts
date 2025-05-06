
import { SwapMatch } from './types';

/**
 * Format raw API data into structured SwapMatch objects
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  if (!matchesData || !Array.isArray(matchesData)) return [];
  
  // Process the matches data into SwapMatch objects
  return matchesData.map((match: any) => {
    // Set default values for colleague types if missing
    const myShiftColleagueType = match.my_shift_colleague_type || 'Unknown';
    const otherShiftColleagueType = match.other_shift_colleague_type || 'Unknown';
    
    // Determine if this is a case where the request is already accepted by another user
    // This happens when the same shift is involved in multiple match requests
    // and one of those matches is already accepted
    let status = match.match_status;
    
    // Check if this match should be marked as "other_accepted"
    if (match.is_other_accepted === true) {
      status = 'other_accepted';
    }
    
    return {
      id: match.match_id,
      status: status,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: match.my_shift_type || getShiftType(match.my_shift_start_time),
        colleagueType: myShiftColleagueType
      },
      otherShift: {
        id: match.other_shift_id,
        date: match.other_shift_date,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck,
        type: match.other_shift_type || getShiftType(match.other_shift_start_time),
        userId: match.other_user_id,
        userName: match.other_user_name || 'Unknown User',
        colleagueType: otherShiftColleagueType
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      createdAt: match.created_at
    };
  });
};

/**
 * Determine shift type based on start time
 */
export const getShiftType = (startTime: string): 'day' | 'afternoon' | 'night' => {
  if (!startTime) return 'unknown' as any;
  
  const hour = parseInt(startTime.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'day';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
};
