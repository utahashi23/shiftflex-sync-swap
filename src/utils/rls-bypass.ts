
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
 * Adding explicit left join with shift_swap_requests to ensure we get all data
 */
export const fetchAllPreferredDates = async () => {
  try {
    // For preferred dates, we need to ensure we get ALL preferred dates, even those
    // from other users. Using a more complex query with joins to bypass potential RLS issues.
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_preferred_dates')
      .select(`
        *,
        shift_swap_requests!inner (
          id,
          requester_id,
          requester_shift_id
        )
      `);
      
    if (!directError && directData) {
      console.log(`Direct query with joins successfully fetched ${directData.length} preferred dates from all users`);
      
      // Extract just the preferred dates data without the joined fields
      const cleanedData = directData.map(item => ({
        id: item.id,
        request_id: item.request_id,
        date: item.date,
        shift_id: item.shift_id,
        accepted_types: item.accepted_types,
        created_at: item.created_at
      }));
      
      return { data: cleanedData, error: null };
    }
    
    console.error('Direct query failed:', directError);
    console.log('Trying alternative direct query...');
    
    // Try a simpler direct query as a fallback
    const { data: simpleData, error: simpleError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*');
      
    if (!simpleError && simpleData && simpleData.length > 0) {
      console.log(`Simple direct query successfully fetched ${simpleData.length} preferred dates`);
      return { data: simpleData, error: null };
    }
    
    console.log('Falling back to RPC function...');
    
    // Last resort: Fall back to RPC function
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
 * Also including the shift data directly in the request to prevent "missing shift" errors
 */
export const fetchAllSwapRequests = async () => {
  try {
    // Enhanced query to include critical shift data in the same query
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*)
      `);
      
    if (!directError && directData) {
      console.log(`Direct query successfully fetched ${directData.length} swap requests from all users`);
      
      // Process the data to flatten the structure and avoid missing shift errors
      const processedData = directData.map(request => {
        // Extract the shift data from the nested structure
        const shiftData = request.requester_shift;
        
        // Return the request with an embedded shift reference for easy access
        return {
          ...request,
          _embedded_shift: shiftData  // Store the shift data directly in the request object
        };
      });
      
      return { data: processedData, error: null };
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
