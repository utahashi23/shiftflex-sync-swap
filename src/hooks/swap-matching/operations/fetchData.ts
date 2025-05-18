
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all data needed for swap matching
 * @returns Data object with all necessary data
 */
export const fetchAllData = async () => {
  try {
    console.log('Fetching all data for swap matching');
    
    // Fetch all swap requests
    const { data: allRequests, error: requestsError } = await supabase
      .rpc('get_all_swap_requests');
      
    if (requestsError) {
      console.error('Error fetching swap requests:', requestsError);
      throw requestsError;
    }
    
    // Fetch all shifts
    const { data: allShifts, error: shiftsError } = await supabase
      .rpc('get_all_shifts');
      
    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      throw shiftsError;
    }
    
    // Fetch all preferred dates
    const { data: preferredDates, error: datesError } = await supabase
      .from('swap_preferred_dates')
      .select('*');
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      throw datesError;
    }
    
    // Fetch all profiles for display names
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, employee_id');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    // Create a map of profiles for easy lookup
    const profilesMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }
    
    return {
      success: true,
      allRequests: allRequests || [],
      allShifts: allShifts || [],
      preferredDates: preferredDates || [],
      profiles,
      profilesMap
    };
  } catch (error) {
    console.error('Error in fetchAllData:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred'
    };
  }
};

