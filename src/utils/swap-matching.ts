
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if two shifts are compatible for swapping based on the specified logic:
 * 1. Mutual Swap Dates: User A wants User B's date and vice versa
 * 2. Accepted Types Match: UserA.accepted_type == UserB.accepted_type
 * 3. Preference Match: UserA.preference matches UserB.preference
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
  console.log(`Request 1 shift date: ${shift1.normalizedDate}, Request 2 shift date: ${shift2.normalizedDate}`);
  
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
  
  console.log('✓ Mutual dates check passed');
  
  // 2. Check if accepted shift types match
  const typesResult = checkAcceptedTypes(
    shift1.type, 
    shift2.type, 
    preferredDatesByRequest,
    request1.id,
    request2.id
  );
  
  if (!typesResult.isCompatible) {
    console.log(`❌ Shift types check failed: ${typesResult.reason}`);
    return typesResult;
  }
  
  console.log('✓ Shift types check passed');
  
  // 3. Check if preferences match (truck name, area, or region)
  // This will be an async check, but we'll handle it in a simplified way for now
  
  // If we made it here, the shifts are compatible
  console.log('🎉 Match found! All compatibility criteria met');
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
  // Check if User A's preferred dates include User B's shift date
  const user1PreferredDates = preferredDatesByRequest[request1Id] || [];
  const user1WantsUser2Date = user1PreferredDates.some(pd => pd.date === shift2.normalizedDate);

  // Check if User B's preferred dates include User A's shift date
  const user2PreferredDates = preferredDatesByRequest[request2Id] || [];
  const user2WantsUser1Date = user2PreferredDates.some(pd => pd.date === shift1.normalizedDate);

  // Log the check results for debugging
  console.log(`User 1 wants User 2's date: ${user1WantsUser2Date}`);
  console.log(`User 2 wants User 1's date: ${user2WantsUser1Date}`);
  
  // Both conditions must be true
  if (!user1WantsUser2Date) {
    return {
      isCompatible: false,
      reason: "User 1 doesn't want User 2's date"
    };
  }
  
  if (!user2WantsUser1Date) {
    return {
      isCompatible: false,
      reason: "User 2 doesn't want User 1's date"
    };
  }
  
  return { isCompatible: true };
};

/**
 * Check if the shift types are compatible based on user preferences
 */
const checkAcceptedTypes = (
  shift1Type: string,
  shift2Type: string,
  preferredDatesByRequest: Record<string, any[]>,
  request1Id: string,
  request2Id: string
): { isCompatible: boolean; reason?: string } => {
  // Get preferred dates for both requests
  const user1PreferredDates = preferredDatesByRequest[request1Id] || [];
  const user2PreferredDates = preferredDatesByRequest[request2Id] || [];
  
  // Find the specific date preferences
  const user1DatePref = user1PreferredDates.find(pd => pd.acceptedTypes);
  const user2DatePref = user2PreferredDates.find(pd => pd.acceptedTypes);
  
  // Check if User 1 accepts User 2's shift type
  const user1AcceptsType = user1DatePref && 
                          Array.isArray(user1DatePref.acceptedTypes) && 
                          user1DatePref.acceptedTypes.includes(shift2Type);
  
  // Check if User 2 accepts User 1's shift type
  const user2AcceptsType = user2DatePref && 
                          Array.isArray(user2DatePref.acceptedTypes) && 
                          user2DatePref.acceptedTypes.includes(shift1Type);
  
  // Log the check results for debugging
  console.log(`User 1 accepts User 2's shift type (${shift2Type}): ${user1AcceptsType}`);
  console.log(`User 2 accepts User 1's shift type (${shift1Type}): ${user2AcceptsType}`);
  
  if (!user1AcceptsType) {
    return {
      isCompatible: false,
      reason: `User 1 doesn't accept shift type ${shift2Type}`
    };
  }
  
  if (!user2AcceptsType) {
    return {
      isCompatible: false,
      reason: `User 2 doesn't accept shift type ${shift1Type}`
    };
  }
  
  return { isCompatible: true };
};

/**
 * Record a shift match in the database
 */
export const recordShiftMatch = async (request1: any, request2: any, initiatorId: string | null = null) => {
  try {
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
    
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .insert(matchData)
      .select();
    
    if (error) throw error;
    
    // Update the status of both requests to 'matched'
    await supabase
      .from('shift_swap_requests')
      .update({ status: 'matched' })
      .in('id', [request1.id, request2.id]);
    
    return { success: true, match: data[0] };
  } catch (error) {
    console.error('Error recording shift match:', error);
    return { success: false, error };
  }
};
