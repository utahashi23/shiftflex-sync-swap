
import { SwapMatch } from './types';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Formats raw API matches data into SwapMatch objects
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  if (!matchesData || !Array.isArray(matchesData)) return [];
  
  return matchesData.map(match => {
    // Parse date strings for consistent formatting
    const myShiftDate = match.my_shift_date ? match.my_shift_date : null;
    const otherShiftDate = match.other_shift_date ? match.other_shift_date : null;
    
    // Format colleague types
    const myShiftColleagueType = match.my_shift_colleague_type || 'Unknown';
    const otherShiftColleagueType = match.other_shift_colleague_type || 'Unknown';
    
    // Format employee IDs
    const myShiftEmployeeId = match.my_shift_employee_id || undefined;
    const otherShiftEmployeeId = match.other_shift_employee_id || undefined;
    
    return {
      id: match.match_id,
      status: match.match_status,
      myShift: {
        id: match.my_shift_id,
        date: myShiftDate,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck,
        type: getShiftType(match.my_shift_start_time),
        colleagueType: myShiftColleagueType,
        employeeId: myShiftEmployeeId
      },
      otherShift: {
        id: match.other_shift_id,
        date: otherShiftDate,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck,
        type: getShiftType(match.other_shift_start_time),
        userId: match.other_user_id,
        userName: match.other_user_name || 'Unknown User',
        colleagueType: otherShiftColleagueType,
        employeeId: otherShiftEmployeeId
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      createdAt: match.created_at
    };
  });
};
