
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all shifts from all users, bypassing RLS
 * This is necessary for admins to see and match shifts across users
 */
export const fetchAllShifts = async () => {
  try {
    // In development mode, prioritize direct query to ensure we get all data
    // This is more reliable for testing and development
    const { data: directData, error: directError } = await supabase
      .from('shifts')
      .select('*');
      
    if (!directError && directData) {
      console.log(`Direct query successfully fetched ${directData.length} shifts from all users`);
      return { data: directData, error: null };
    }
    
    console.error('Direct query failed:', directError);
    console.log('Falling back to RPC function...');
    
    // Fall back to RPC function if direct query fails
    const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_all_shifts');
    
    if (shiftsError) {
      console.error('RPC fallback also failed:', shiftsError);
      return { data: null, error: shiftsError };
    }
    
    console.log(`RPC Successfully fetched ${shiftsData.length} shifts from all users`);
    return { data: shiftsData, error: null };
  } catch (error) {
    console.error('Error in fetchAllShifts:', error);
    return { data: null, error };
  }
};

/**
 * Fetches all preferred dates from all users, bypassing RLS
 */
export const fetchAllPreferredDates = async () => {
  try {
    // In development mode, prioritize direct query
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*');
      
    if (!directError && directData) {
      console.log(`Direct query successfully fetched ${directData.length} preferred dates from all users`);
      return { data: directData, error: null };
    }
    
    console.error('Direct query failed:', directError);
    console.log('Falling back to RPC function...');
    
    // Fall back to RPC function
    const { data: datesData, error: datesError } = await supabase.rpc('get_all_preferred_dates');
    
    if (datesError) {
      console.error('RPC fallback also failed:', datesError);
      return { data: null, error: datesError };
    }
    
    console.log(`RPC Successfully fetched ${datesData.length} preferred dates from all users`);
    return { data: datesData, error: null };
  } catch (error) {
    console.error('Error in fetchAllPreferredDates:', error);
    return { data: null, error };
  }
};

/**
 * Fetches all swap requests from all users, bypassing RLS
 */
export const fetchAllSwapRequests = async () => {
  try {
    // In development mode, prioritize direct query
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select('*');
      
    if (!directError && directData) {
      console.log(`Direct query successfully fetched ${directData.length} swap requests from all users`);
      return { data: directData, error: null };
    }
    
    console.error('Direct query failed:', directError);
    console.log('Falling back to RPC function...');
    
    // Fall back to RPC function
    const { data: requestsData, error: requestsError } = await supabase.rpc('get_all_swap_requests');
    
    if (requestsError) {
      console.error('RPC fallback also failed:', requestsError);
      return { data: null, error: requestsError };
    }
    
    console.log(`RPC Successfully fetched ${requestsData.length} swap requests from all users`);
    return { data: requestsData, error: null };
  } catch (error) {
    console.error('Error in fetchAllSwapRequests:', error);
    return { data: null, error };
  }
};
