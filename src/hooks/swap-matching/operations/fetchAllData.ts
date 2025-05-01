
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all necessary data for swap matching
 * Designed to fetch data efficiently while avoiding RLS recursion issues
 */
export const fetchAllData = async () => {
  try {
    // Fetch all pending swap requests
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
      .gt('preferred_dates_count', 0); // Only include requests with at least one preferred date
      
    if (requestsError) {
      console.error('Error fetching swap requests:', requestsError);
      return { success: false, message: "Failed to fetch swap requests" };
    }
    
    if (!pendingRequests || pendingRequests.length === 0) {
      return { success: false, message: "No pending swap requests" };
    }
    
    console.log(`Found ${pendingRequests.length} pending swap requests`);
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, message: "Failed to fetch user profiles" };
    }
    
    // Get all preferred dates for the pending requests
    const requestIds = pendingRequests.map(req => req.id);
    const { data: preferredDates, error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      return { success: false, message: "Failed to fetch preferred dates" };
    }
    
    // Get shift IDs from pending requests
    const shiftIds = pendingRequests
      .map(req => req.requester_shift_id)
      .filter(Boolean);
      
    // Fetch shifts by ID
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return { success: false, message: "Failed to fetch shifts" };
    }
    
    // Create a map of profiles by ID for quick lookup
    const profilesMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    return { 
      success: true, 
      allRequests: pendingRequests,
      allShifts: shifts || [], 
      preferredDates: preferredDates || [],
      profilesMap
    };
  } catch (error: any) {
    console.error('Error fetching swap matching data:', error);
    return { 
      success: false, 
      message: "An unexpected error occurred", 
      error: error.message 
    };
  }
};
