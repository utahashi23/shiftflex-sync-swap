
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all necessary data for swap matching
 * Better structure to avoid RLS recursion issues
 */
export const fetchSwapMatchingData = async () => {
  try {
    console.log('Fetching all swap matching data');
    
    // 1. Fetch pending swap requests with appropriate filters
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
      .gt('preferred_dates_count', 0);
      
    if (requestsError) {
      console.error('Error fetching swap requests:', requestsError);
      throw requestsError;
    }
    
    if (!pendingRequests || pendingRequests.length === 0) {
      return { success: false, message: "No pending swap requests" };
    }
    
    console.log(`Found ${pendingRequests.length} pending swap requests`);
    
    // 2. Get all profiles 
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    console.log('Fetched profiles:', profiles?.length || 0);
    
    // 3. Get all request IDs we need
    const requestIds = pendingRequests.map(req => req.id);
    
    // 4. Fetch preferred dates for all requests
    const { data: preferredDates, error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      throw datesError;
    }
    
    if (!preferredDates || preferredDates.length === 0) {
      console.log('No preferred dates found despite having pending requests with preferred_dates_count > 0');
      return { success: false, message: "No swap preferences found" };
    }
    
    console.log(`Found ${preferredDates.length} preferred dates`);
    
    // 5. Get all shift IDs from our requests
    const shiftIds = pendingRequests
      .map(req => req.requester_shift_id)
      .filter(Boolean);
      
    console.log(`Need to fetch ${shiftIds.length} shifts by ID`);
    
    // 6. Fetch shifts by ID
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (shiftsError) {
      console.error('Error fetching specific shifts:', shiftsError);
      throw shiftsError;
    }
    
    console.log(`Fetched ${shifts?.length || 0} shifts`);
    
    // 7. Create a map of user IDs to profile info for quick lookup
    const profilesMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    return { 
      success: true, 
      allRequests: pendingRequests,
      allShifts: shifts || [], 
      preferredDates,
      profilesMap
    };
  } catch (error: any) {
    console.error('Error fetching swap matching data:', error);
    return { success: false, error };
  }
};
