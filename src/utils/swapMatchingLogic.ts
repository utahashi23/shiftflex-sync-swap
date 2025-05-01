
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Check if users want to swap shifts based on their preferences
 */
export const checkSwapCompatibility = (
  request: any,
  otherRequest: any,
  requestShift: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
) => {
  console.log(`----- MATCHING CHECK DETAILS -----`);
  console.log(`Request ${request.id} shift: ${requestShift.normalizedDate} (${requestShift.type})`);
  console.log(`Request ${otherRequest.id} shift: ${otherRequestShift.normalizedDate} (${otherRequestShift.type})`);
  
  // Check if the first user wants the second user's shift date and type
  let firstUserWantsSecondDate = false;
  let firstUserWantsSecondType = false;
  const prefDates = preferredDatesByRequest[request.id] || [];
  
  for (const prefDate of prefDates) {
    if (prefDate.date === otherRequestShift.normalizedDate) {
      firstUserWantsSecondDate = true;
      console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
      
      if (prefDate.acceptedTypes.length === 0 || prefDate.acceptedTypes.includes(otherRequestShift.type)) {
        firstUserWantsSecondType = true;
        console.log(`User ${request.requester_id} wants shift type ${otherRequestShift.type}`);
      } else {
        console.log(`User ${request.requester_id} doesn't want shift type ${otherRequestShift.type}`);
      }
      break;
    }
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    console.log(`No match: User ${request.requester_id} doesn't want the other shift`);
    return { isCompatible: false };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  for (const prefDate of otherPrefDates) {
    if (prefDate.date === requestShift.normalizedDate) {
      secondUserWantsFirstDate = true;
      console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
      
      if (prefDate.acceptedTypes.length === 0 || prefDate.acceptedTypes.includes(requestShift.type)) {
        secondUserWantsFirstType = true;
        console.log(`User ${otherRequest.requester_id} wants shift type ${requestShift.type}`);
      } else {
        console.log(`User ${otherRequest.requester_id} doesn't want shift type ${requestShift.type}`);
      }
      break;
    }
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    console.log(`No match: User ${otherRequest.requester_id} doesn't want the other shift`);
    return { isCompatible: false };
  }
  
  // Check if either user is already rostered on the swap date
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    console.log(`User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`);
    return { isCompatible: false };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}`);
    return { isCompatible: false };
  }
  
  // We have a match!
  console.log(`🎉 MATCH FOUND between requests ${request.id} and ${otherRequest.id}`);
  console.log(`User ${request.requester_id} wants to swap with User ${otherRequest.requester_id}`);
  
  return { isCompatible: true };
};

/**
 * Record a shift swap match in the database
 */
export const recordShiftMatch = async (request: any, otherRequest: any, userId: string) => {
  try {
    // Record the match in the potential_matches table
    const { data: matchData, error: matchError } = await supabase
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request.id,
        acceptor_request_id: otherRequest.id,
        requester_shift_id: request.requester_shift_id,
        acceptor_shift_id: otherRequest.requester_shift_id,
        match_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
      
    if (matchError) {
      console.error('Error recording match:', matchError);
      return { success: false, error: matchError };
    }
    
    console.log('Match recorded:', matchData);
    
    // Update both requests to matched status
    const { error: error1 } = await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: otherRequest.requester_id,
        acceptor_shift_id: otherRequest.requester_shift_id
      })
      .eq('id', request.id);
      
    if (error1) {
      console.error('Error updating first request:', error1);
      return { success: false, error: error1 };
    }
    
    const { error: error2 } = await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: request.requester_id,
        acceptor_shift_id: request.requester_shift_id
      })
      .eq('id', otherRequest.id);
      
    if (error2) {
      console.error('Error updating second request:', error2);
      return { success: false, error: error2 };
    }
    
    // Notify if the current user is involved
    if (request.requester_id === userId || otherRequest.requester_id === userId) {
      toast({
        title: "Match Found!",
        description: `Your shift swap request has been matched.`,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing match:', error);
    return { success: false, error };
  }
};

/**
 * Fetch all necessary data for swap matching
 */
export const fetchSwapMatchingData = async () => {
  try {
    // Fetch ALL pending swap requests from ALL users
    console.log('Fetching ALL pending swap requests...');
    const { data: allRequests, error: requestsError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id, 
        requester_id, 
        requester_shift_id, 
        status, 
        preferred_dates_count
      `)
      .eq('status', 'pending')
      .gt('preferred_dates_count', 0); // Only include requests with at least one preferred date
      
    if (requestsError) throw requestsError;
    
    if (!allRequests || allRequests.length === 0) {
      return { success: false, message: "No pending swap requests" };
    }
    
    console.log(`Found ${allRequests.length} pending swap requests:`, allRequests);
    
    // Get all profiles - not just for requesters - we want ALL profiles
    console.log('Fetching ALL profiles:');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) throw profilesError;
    console.log('Fetched profiles:', profiles?.length || 0);
    
    // Get all preferred dates
    const requestIds = allRequests.map(req => req.id);
    console.log('Fetching preferred dates...');
    const { data: preferredDates, error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (datesError) throw datesError;
    
    if (!preferredDates || preferredDates.length === 0) {
      return { success: false, message: "No swap preferences" };
    }
    
    console.log(`Found ${preferredDates.length} preferred dates:`, preferredDates);
    
    // Get ALL shifts for ALL users - get all of them, not just for the requesters
    console.log('Fetching ALL shifts for ALL users...');
    const { data: allShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*');
      
    if (shiftsError) throw shiftsError;
    
    if (!allShifts || allShifts.length === 0) {
      return { success: false, message: "No shifts found" };
    }
    
    console.log(`Found ${allShifts.length} shifts across all users`);
    
    // Create a map of user IDs to profile info for quick lookup
    const profilesMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    return { 
      success: true, 
      data: {
        allRequests,
        allShifts,
        preferredDates,
        profilesMap
      }
    };
  } catch (error: any) {
    console.error('Error fetching swap matching data:', error);
    return { success: false, error };
  }
};
