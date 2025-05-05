
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
    console.log('Raw match data to process:', match);
    
    // Directly extract colleague types from the API response
    // These fields should exist in the response as my_shift_colleague_type and other_shift_colleague_type
    const myShiftColleagueType = match.my_shift_colleague_type;
    const otherShiftColleagueType = match.other_shift_colleague_type;
    
    // Log the colleague types we extracted
    console.log(`Match ID ${match.match_id} extracted colleague types:`, {
      my: myShiftColleagueType || 'Not provided in API response',
      other: otherShiftColleagueType || 'Not provided in API response'
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
        colleagueType: myShiftColleagueType || 'Unknown' // Use null fallback instead of empty string
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
        colleagueType: otherShiftColleagueType || 'Unknown' // Use null fallback instead of empty string
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      createdAt: match.created_at
    };
  });
};
