
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
    console.log(`Processing match ID ${match.match_id} with status ${match.match_status}:`, match);
    
    // Look for colleague_type in various possible locations
    const myShiftColleagueType = 
      match.my_shift_colleague_type || 
      (match.my_shift_data && match.my_shift_data.colleague_type) ||
      'Unknown';
    
    const otherShiftColleagueType = 
      match.other_shift_colleague_type || 
      (match.other_shift_data && match.other_shift_data.colleague_type) ||
      'Unknown';
    
    // Check if this match has the other_accepted status or flag
    const isOtherAccepted = 
      match.match_status === 'other_accepted' || 
      match.is_other_accepted === true || 
      match.other_accepted === true;
    
    // Set the correct status, prioritizing 'other_accepted' if flag is present
    const matchStatus = isOtherAccepted ? 'other_accepted' : match.match_status;
    
    // Extract employee IDs if available
    const myEmployeeId = match.my_employee_id || null;
    const otherEmployeeId = match.other_employee_id || null;
    
    // Extract requester ID if available
    const requesterId = match.requester_id || null;
    
    // Extract user IDs for determining acceptance state
    const myUserId = match.my_user_id || match.requester_id;
    const otherUserId = match.other_user_id;
    
    console.log(`Match ${match.match_id} status: ${matchStatus}, colleague types:`, {
      myShift: myShiftColleagueType,
      otherShift: otherShiftColleagueType,
      isOtherAccepted,
      myEmployeeId,
      otherEmployeeId,
      requesterId,
      myUserId,
      otherUserId
    });
    
    return {
      id: match.match_id,
      status: matchStatus,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: getShiftType(match.my_shift_start_time),
        colleagueType: myShiftColleagueType,
        employeeId: myEmployeeId,
        userId: myUserId
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
        colleagueType: otherShiftColleagueType,
        employeeId: otherEmployeeId
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      requesterId: requesterId,
      createdAt: match.created_at
    };
  });
};
