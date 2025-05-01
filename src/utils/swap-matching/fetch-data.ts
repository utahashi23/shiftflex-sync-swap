
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all necessary data for swap matching
 */
export const fetchSwapMatchingData = async () => {
  try {
    // Exclude admin user ID from all queries
    const ADMIN_USER_ID = '7c31ceb6-bec9-4ea8-b65a-b6629547b52e';
    
    console.log('RLS BYPASS ATTEMPT: Using multiple strategies to fetch ALL data');
    
    // STRATEGY 1: Fetch ALL pending swap requests from ALL users except admin
    console.log('Fetching ALL pending swap requests...');
    
    // First try with standard query
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id, 
        requester_id, 
        requester_shift_id, 
        status, 
        preferred_dates_count
      `)
      .eq('status', 'pending')
      .gt('preferred_dates_count', 0) // Only include requests with at least one preferred date
      .neq('requester_id', ADMIN_USER_ID); // Exclude admin user
      
    if (requestsError) {
      console.error('Error fetching swap requests:', requestsError);
      throw requestsError;
    }
    
    if (!pendingRequests || pendingRequests.length === 0) {
      return { success: false, message: "No pending swap requests" };
    }
    
    console.log(`Strategy 1: Found ${pendingRequests.length} pending swap requests`);
    
    // Get all profiles except admin
    console.log('Fetching ALL profiles except admin:');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', ADMIN_USER_ID);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    console.log('Fetched profiles:', profiles?.length || 0);
    
    // STRATEGY 2: Try to get all preferred dates
    console.log('STRATEGY 2: Fetching ALL preferred dates...');
    
    // First, get request IDs we need
    const requestIds = pendingRequests.map(req => req.id);
    console.log(`Looking for preferred dates for ${requestIds.length} requests`);
    
    // Special query for preferred dates that explicitly filters by request IDs
    const { data: preferredDates, error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);  // Only fetch dates for our pending requests
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      throw datesError;
    }
    
    if (!preferredDates || preferredDates.length === 0) {
      console.log('No preferred dates found despite having pending requests with preferred_dates_count > 0');
      return { success: false, message: "No swap preferences found" };
    }
    
    console.log(`Strategy 2: Found ${preferredDates.length} preferred dates`);
    
    // STRATEGY 3: Special approach for shifts - use explicit filters
    console.log('STRATEGY 3: Fetching ALL shifts...');
    
    // Get all the shift IDs from our requests
    const requestShiftIds = pendingRequests
      .map(req => req.requester_shift_id)
      .filter(Boolean);
      
    console.log(`Need to fetch ${requestShiftIds.length} specific shifts by ID`);
    
    // First, fetch shifts by ID that we know we need
    const { data: requestedShifts, error: shiftsError1 } = await supabase
      .from('shifts')
      .select('*')
      .in('id', requestShiftIds);
      
    if (shiftsError1) {
      console.error('Error fetching specific shifts:', shiftsError1);
      throw shiftsError1;
    }
    
    console.log(`Fetched ${requestedShifts?.length || 0} shifts by ID`);
    
    // Now try to get ALL shifts from ALL users
    const { data: allOtherShifts, error: shiftsError2 } = await supabase
      .from('shifts')
      .select('*')
      .neq('user_id', ADMIN_USER_ID);  // Exclude admin shifts
      
    if (shiftsError2) {
      console.error('Error fetching all other shifts:', shiftsError2);
      throw shiftsError2;
    }
    
    console.log(`Fetched ${allOtherShifts?.length || 0} total shifts`);
    
    // Combine both sets of shifts, removing duplicates by ID
    const shiftMap = new Map();
    requestedShifts?.forEach(shift => shiftMap.set(shift.id, shift));
    allOtherShifts?.forEach(shift => {
      if (!shiftMap.has(shift.id)) {
        shiftMap.set(shift.id, shift);
      }
    });
    
    // Convert the Map back to an array
    const allShifts = Array.from(shiftMap.values());
    console.log(`Combined: ${allShifts.length} unique shifts after merging`);
    
    // Log all unique user IDs in shifts for debugging
    const userIds = [...new Set(allShifts.map(s => s.user_id))];
    console.log('Shift data includes these user IDs:', userIds);
    
    // Create a map of user IDs to profile info for quick lookup
    const profilesMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    return { 
      success: true, 
      data: {
        allRequests: pendingRequests,
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
