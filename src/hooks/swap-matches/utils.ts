
import { SwapMatch } from './types';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Format raw API matches data into SwapMatch objects
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
    return [];
  }
  
  // Process and format the matches data
  return matchesData.map(match => {
    return {
      id: match.match_id,
      status: match.match_status,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: getShiftType(match.my_shift_start_time)
      },
      otherShift: {
        id: match.other_shift_id,
        date: match.other_shift_date,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck,
        type: getShiftType(match.other_shift_start_time),
        userId: match.other_user_id,
        userName: match.other_user_name || 'Unknown User'
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      createdAt: match.created_at
    };
  });
};
