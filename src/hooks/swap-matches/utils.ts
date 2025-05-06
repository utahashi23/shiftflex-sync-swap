
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
      createdAt: match.created_at,
      isConflictingWithAccepted: match.is_conflicting || false
    };
  });

  // Now let's identify conflicts with accepted swaps
  // If there's an accepted swap for either the myShift or otherShift,
  // mark other pending swaps involving those shifts as conflicting
  const acceptedMatches = formattedMatches.filter(match => match.status === 'accepted');
  
  // If no accepted matches, return as is
  if (acceptedMatches.length === 0) {
    return formattedMatches;
  }
  
  console.log(`Found ${acceptedMatches.length} accepted matches. Will mark conflicting ones.`);
  
  // Create sets of shifts and requests that are already part of accepted matches
  const acceptedShiftIds = new Set<string>();
  const acceptedRequestIds = new Set<string>();
  
  acceptedMatches.forEach(match => {
    acceptedShiftIds.add(match.myShift.id);
    acceptedShiftIds.add(match.otherShift.id);
    acceptedRequestIds.add(match.myRequestId);
    acceptedRequestIds.add(match.otherRequestId);
  });
  
  console.log(`Shifts in accepted swaps: ${Array.from(acceptedShiftIds).join(', ')}`);
  console.log(`Requests in accepted swaps: ${Array.from(acceptedRequestIds).join(', ')}`);

  // For pending matches, check if they conflict with accepted matches
  return formattedMatches.map(match => {
    if (match.status === 'pending') {
      // If this pending match involves a shift or request that's part of an accepted match,
      // mark it as conflicting
      const isConflicting = 
        acceptedShiftIds.has(match.myShift.id) || 
        acceptedShiftIds.has(match.otherShift.id) ||
        acceptedRequestIds.has(match.myRequestId) ||
        acceptedRequestIds.has(match.otherRequestId);
      
      if (isConflicting) {
        console.log(`Marking match ${match.id} as conflicting because it involves shifts or requests from an accepted match`);
      }
      
      return { ...match, isConflictingWithAccepted: isConflicting };
    }
    return match;
  });
};

/**
 * Check if a swap request is part of another accepted swap
 */
export const isPartOfAcceptedSwap = (match: SwapMatch, allMatches: SwapMatch[]): boolean => {
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
  
  if (isConflicting) {
    console.log(`Match ${match.id} is conflicting with an accepted swap`);
  }
  
  return isConflicting;
};
