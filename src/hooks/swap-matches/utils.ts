
import { SwapMatch } from './types';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Format raw match data into SwapMatch objects
 */
export const formatSwapMatches = (matchesData: any[]): SwapMatch[] => {
  console.log("Formatting raw match data:", matchesData);

  return matchesData.map((match) => {
    // Determine acceptance status for each user
    const requesterHasAccepted = match.requester_has_accepted === true;
    const acceptorHasAccepted = match.acceptor_has_accepted === true;
    
    console.log(`Match ${match.match_id}: requester accepted=${requesterHasAccepted}, acceptor accepted=${acceptorHasAccepted}`);

    return {
      id: match.match_id,
      status: match.match_status,
      myShift: {
        id: match.my_shift_id,
        date: match.my_shift_date,
        startTime: match.my_shift_start_time,
        endTime: match.my_shift_end_time,
        truckName: match.my_shift_truck || null,
        type: getShiftType(match.my_shift_start_time),
        colleagueType: match.my_shift_colleague_type || 'Unknown',
        employeeId: match.my_employee_id,
        userId: match.my_user_id
      },
      otherShift: {
        id: match.other_shift_id,
        date: match.other_shift_date,
        startTime: match.other_shift_start_time,
        endTime: match.other_shift_end_time,
        truckName: match.other_shift_truck || null,
        type: getShiftType(match.other_shift_start_time),
        colleagueType: match.other_shift_colleague_type || 'Unknown',
        userId: match.other_user_id,
        userName: match.other_user_name || 'Unknown User',
        employeeId: match.other_employee_id
      },
      myRequestId: match.my_request_id,
      otherRequestId: match.other_request_id,
      createdAt: match.created_at,
      requesterId: match.requester_id,
      acceptorId: match.acceptor_id,
      // Include acceptance tracking
      requesterHasAccepted,
      acceptorHasAccepted
    };
  });
};

/**
 * Check if a match is relevant to the user
 */
export const isMatchRelevantToUser = (match: any, userId: string): boolean => {
  return match.requester_id === userId || match.acceptor_id === userId;
};
