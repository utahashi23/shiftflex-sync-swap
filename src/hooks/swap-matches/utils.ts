
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
  const formattedMatches = matchesData.map(match => {
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
    
    console.log(`Match ${match.match_id} status: ${match.match_status}, colleague types:`, {
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

  return formattedMatches;
};

/**
 * Check if a swap request is part of another accepted swap
 * Note: This is kept for compatibility but shouldn't be needed anymore
 * since we now handle conflicts on the server side.
 */
export const isPartOfAcceptedSwap = (match: SwapMatch, allMatches: SwapMatch[]): boolean => {
  // If the match status is already 'otherAccepted', it's conflicting
  if (match.status === 'otherAccepted') return true;
  
  // If the match itself is accepted, it's not conflicting
  if (match.status === 'accepted') return false;
  
  // Check if there are any accepted matches at all
  const hasAcceptedMatches = allMatches.some(m => m.status === 'accepted');
  
  // If there are no accepted matches, then this match isn't conflicting
  if (!hasAcceptedMatches) return false;
  
  // Look for accepted swaps that involve the same shift or request
  const isConflicting = allMatches.some(otherMatch => 
    otherMatch.id !== match.id && 
    otherMatch.status === 'accepted' && 
    (otherMatch.myShift.id === match.myShift.id || 
     otherMatch.otherShift.id === match.myShift.id ||
     otherMatch.myShift.id === match.otherShift.id || 
     otherMatch.otherShift.id === match.otherShift.id ||
     otherMatch.myRequestId === match.myRequestId ||
     otherMatch.otherRequestId === match.myRequestId ||
     otherMatch.myRequestId === match.otherRequestId ||
     otherMatch.otherRequestId === match.otherRequestId)
  );
  
  return isConflicting;
};
