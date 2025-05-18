
import { supabase } from '@/integrations/supabase/client';
import { normalizeDate, areDatesEqual } from '@/utils/dateUtils';

/**
 * Check if two shifts are compatible for swapping based on the mutual swap dates logic:
 * User A wants User B's date and User B wants User A's date
 */
export const checkSwapCompatibility = (
  request1: any,
  request2: any,
  shift1: any,
  shift2: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
): { isCompatible: boolean; reason?: string } => {
  console.log('== CHECKING SWAP COMPATIBILITY ==');
  console.log(`Between request ${request1.id.substring(0, 6)} and ${request2.id.substring(0, 6)}`);
  console.log(`Request 1 shift date: ${shift1.normalizedDate || shift1.date}, Request 2 shift date: ${shift2.normalizedDate || shift2.date}`);
  
  // 1. Check for mutual swap dates (User A wants B's date and User B wants A's date)
  const mutualDatesResult = checkMutualSwapDates(
    shift1, 
    shift2, 
    preferredDatesByRequest, 
    request1.id, 
    request2.id
  );
  
  if (!mutualDatesResult.isCompatible) {
    console.log(`❌ Mutual dates check failed: ${mutualDatesResult.reason}`);
    return mutualDatesResult;
  }
  
  console.log('✓ Mutual dates check passed - Users want to swap each other\'s dates');
  console.log('🎉 Match found! Mutual swap dates criteria met');
  return { isCompatible: true };
};

/**
 * Check if the dates are mutually requested by both users
 */
const checkMutualSwapDates = (
  shift1: any,
  shift2: any,
  preferredDatesByRequest: Record<string, any[]>,
  request1Id: string,
  request2Id: string
): { isCompatible: boolean; reason?: string } => {
  // Get the normalized dates
  const shift1Date = shift1.normalizedDate || normalizeDate(shift1.date);
  const shift2Date = shift2.normalizedDate || normalizeDate(shift2.date);
  
  console.log(`Checking if users want to swap dates: ${shift1Date} <-> ${shift2Date}`);
  
  // Check if User A's preferred dates include User B's shift date
  const user1PreferredDates = preferredDatesByRequest[request1Id] || [];
  const user1WantsUser2Date = user1PreferredDates.some(pd => {
    const pdNormalizedDate = normalizeDate(pd.date);
    const isMatch = pdNormalizedDate === shift2Date;
    console.log(`User 1 preferred date ${pdNormalizedDate} matches User 2's shift date ${shift2Date}? ${isMatch}`);
    return isMatch;
  });

  // Check if User B's preferred dates include User A's shift date
  const user2PreferredDates = preferredDatesByRequest[request2Id] || [];
  const user2WantsUser1Date = user2PreferredDates.some(pd => {
    const pdNormalizedDate = normalizeDate(pd.date);
    const isMatch = pdNormalizedDate === shift1Date;
    console.log(`User 2 preferred date ${pdNormalizedDate} matches User 1's shift date ${shift1Date}? ${isMatch}`);
    return isMatch;
  });

  // Log all preferred dates for debugging
  console.log('User 1 preferred dates:', user1PreferredDates.map(pd => {
    return {
      original: pd.date,
      normalized: normalizeDate(pd.date),
      matchesShift2: normalizeDate(pd.date) === shift2Date
    };
  }));
  
  console.log('User 2 preferred dates:', user2PreferredDates.map(pd => {
    return {
      original: pd.date,
      normalized: normalizeDate(pd.date), 
      matchesShift1: normalizeDate(pd.date) === shift1Date
    };
  }));
  
  // Log the check results for debugging
  console.log(`User 1 wants User 2's date (${shift2Date}): ${user1WantsUser2Date}`);
  console.log(`User 2 wants User 1's date (${shift1Date}): ${user2WantsUser1Date}`);
  
  // Both conditions must be true for a mutual match
  if (!user1WantsUser2Date) {
    return {
      isCompatible: false,
      reason: `User 1 doesn't want User 2's date (${shift2Date})`
    };
  }
  
  if (!user2WantsUser1Date) {
    return {
      isCompatible: false,
      reason: `User 2 doesn't want User 1's date (${shift1Date})`
    };
  }
  
  return { isCompatible: true };
};

/**
 * Record a shift match in the database
 */
export const recordShiftMatch = async (request1: any, request2: any, initiatorId: string | null = null) => {
  try {
    console.log('Recording shift match between:');
    console.log(`- Request 1: ${request1.id} (User: ${request1.requester_id}))`);
    console.log(`- Request 2: ${request2.id} (User: ${request2.requester_id}))`);

    // Create a new match record
    const matchData = {
      requester_request_id: request1.id,
      acceptor_request_id: request2.id,
      requester_shift_id: request1.requester_shift_id,
      acceptor_shift_id: request2.requester_shift_id,
      match_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      requester_has_accepted: false,
      acceptor_has_accepted: false
    };
    
    console.log('Match data being inserted:', matchData);
    
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .insert(matchData)
      .select();
    
    if (error) {
      console.error('Error recording shift match:', error);
      throw error;
    }
    
    console.log('Match recorded successfully:', data);
    
    // Update the status of both requests to 'matched'
    const { error: updateError } = await supabase
      .from('shift_swap_requests')
      .update({ status: 'matched' })
      .in('id', [request1.id, request2.id]);
      
    if (updateError) {
      console.error('Error updating request statuses:', updateError);
    } else {
      console.log('Request statuses updated to "matched"');
    }
    
    return { success: true, match: data[0] };
  } catch (error) {
    console.error('Error recording shift match:', error);
    return { success: false, error };
  }
};
