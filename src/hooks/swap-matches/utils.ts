
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
    // Log raw match data for debugging
    console.log(`Processing match ID ${match.match_id}:`, match);
    
    // Look for colleague_type in various possible locations
    const myShiftColleagueType = 
      match.my_shift_colleague_type || 
      (match.my_shift_data && match.my_shift_data.colleague_type) ||
      'Unknown';
    
    const otherShiftColleagueType = 
      match.other_shift_colleague_type || 
      (match.other_shift_data && match.other_shift_data.colleague_type) ||
      'Unknown';
    
    console.log(`Match ${match.match_id} colleague types:`, {
      myShift: myShiftColleagueType,
      otherShift: otherShiftColleagueType
    });
    
    return {
      id: match.match_id,
      status: match.match_status,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: getShiftType(match.my_shift_start_time),
        colleagueType: myShiftColleagueType
      },
      otherShift: {
        id: match.other_shift_id,
        date: match.other_shift_date,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck,
        type: getShiftType(match.other_shift_start_time),
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
