
import { SwapMatch } from './types';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Formats raw match data from the API into SwapMatch objects
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  if (!matchesData || !Array.isArray(matchesData)) {
    console.log('No match data to format');
    return [];
  }
  
  // Create a Map to track unique swap IDs to remove duplicates
  const uniqueMatches = new Map();
  
  matchesData.forEach(match => {
    // Skip if match is null or undefined
    if (!match) return;
    
    // Only process each match once by match_id
    if (!uniqueMatches.has(match.match_id)) {
      try {
        // Use the common getShiftType function for consistency
        const myShiftType = getShiftType(match.my_shift_start_time);
        const otherShiftType = getShiftType(match.other_shift_start_time);
        
        uniqueMatches.set(match.match_id, {
          id: match.match_id,
          status: match.match_status,
          myShift: {
            id: match.my_shift_id,
            date: match.my_shift_date,
            startTime: match.my_shift_start_time,
            endTime: match.my_shift_end_time,
            truckName: match.my_shift_truck,
            type: myShiftType
          },
          otherShift: {
            id: match.other_shift_id,
            date: match.other_shift_date,
            startTime: match.other_shift_start_time,
            endTime: match.other_shift_end_time,
            truckName: match.other_shift_truck,
            type: otherShiftType,
            userId: match.other_user_id,
            userName: match.other_user_name
          },
          myRequestId: match.my_request_id,
          otherRequestId: match.other_request_id,
          createdAt: match.created_at
        });
      } catch (error) {
        console.error('Error formatting match:', error);
      }
    }
  });
  
  // Convert the Map values back to an array
  return Array.from(uniqueMatches.values());
};
