
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all shifts from all users, bypassing RLS
 * This is necessary for admins to see and match shifts across users
 */
export const fetchAllShifts = async () => {
  try {
    console.log('Attempting to fetch ALL shifts using RPC function...');
    
    // First check admin status using the test_admin_access function
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    const isAdmin = adminCheckData && typeof adminCheckData === 'object' && 'is_admin' in adminCheckData 
      ? Boolean(adminCheckData.is_admin) 
      : false;
    
    console.log('Admin check result:', adminCheckData);
    
    // Try with our RPC function (most reliable method)
    const { data: shiftsData, error: shiftsError } = await supabase.rpc('get_all_shifts');
    
    if (!shiftsError && shiftsData && shiftsData.length > 0) {
      console.log(`RPC Successfully fetched ${shiftsData.length} shifts from all users`);
      return { data: shiftsData, error: null };
    }
    
    if (shiftsError) {
      console.error('RPC function failed:', shiftsError);
    } else {
      console.log('RPC function returned no data, trying direct query...');
    }
    
    // Fall back to direct query if admin
    if (isAdmin) {
      console.log('Admin access confirmed, trying direct query...');
      // Direct query for admins should work with RLS
      const { data: directData, error: directError } = await supabase
        .from('shifts')
        .select('*');
        
      if (!directError && directData) {
        console.log(`Direct query successfully fetched ${directData.length} shifts from all users`);
        return { data: directData, error: null };
      }
      
      console.error('Direct query failed despite admin access:', directError);
    }
    
    console.log('All attempts to fetch shifts failed, returning empty array');
    return { data: [], error: new Error('Failed to fetch shifts data') };
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
    console.log('Attempting to fetch ALL preferred dates using RPC function...');
    
    // Check admin status first
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    const isAdmin = adminCheckData && typeof adminCheckData === 'object' && 'is_admin' in adminCheckData 
      ? Boolean(adminCheckData.is_admin) 
      : false;
    
    console.log('Admin check for preferred dates:', adminCheckData);
    
    // Try with our RPC function first
    const { data: datesData, error: datesError } = await supabase.rpc('get_all_preferred_dates');
    
    if (!datesError && datesData && datesData.length > 0) {
      console.log(`RPC Successfully fetched ${datesData.length} preferred dates from all users`);
      return { data: datesData, error: null };
    }
    
    if (datesError) {
      console.error('RPC function failed:', datesError);
    } else {
      console.log('RPC function returned no data, trying direct query...');
    }
    
    // Fall back to direct query if admin
    if (isAdmin) {
      console.log('Admin access confirmed, trying direct query for preferred dates...');
      
      // For preferred dates, we'll try a direct query
      const { data: directData, error: directError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*');
        
      if (!directError && directData && directData.length > 0) {
        console.log(`Direct query fetched ${directData.length} preferred dates`);
        return { data: directData, error: null };
      }
      
      console.error('Direct query for preferred dates failed:', directError);
    }
    
    console.log('All attempts to fetch preferred dates failed, returning empty array');
    return { data: [], error: new Error('Failed to fetch preferred dates data') };
  } catch (error) {
    console.error('Error in fetchAllPreferredDates:', error);
    return { data: null, error };
  }
};

/**
 * Fetches all swap requests from all users, bypassing RLS
 * IMPORTANT UPDATE: Using RPC function that explicitly ignores RLS permissions
 */
export const fetchAllSwapRequests = async () => {
  try {
    // First try to get data from our get_all_swap_requests function
    console.log('Fetching all swap requests with RPC method...');
    const { data: requestsData, error: requestsError } = await supabase.rpc('get_all_swap_requests');
    
    if (!requestsError && requestsData && requestsData.length > 0) {
      console.log(`RPC Successfully fetched ${requestsData.length} swap requests from all users`);
      
      // We need to fetch the associated shifts separately
      const shiftIds = requestsData.map(req => req.requester_shift_id).filter(Boolean);
      
      // Get the shifts
      const { data: shiftsData } = await fetchAllShifts();
      
      // Create a map of shifts by ID
      const shiftMap = new Map();
      if (shiftsData && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          shiftMap.set(shift.id, shift);
        });
      }
      
      // Attach the shift data to each request
      const processedData = requestsData.map(request => {
        // Find the associated shift
        const shiftData = shiftMap.get(request.requester_shift_id);
        
        return {
          ...request,
          _embedded_shift: shiftData || null
        };
      });
      
      console.log('Processed swap requests data:', processedData.length);
      return { data: processedData, error: null };
    }
    
    // If RPC fails, try direct query with joins as fallback
    console.log('RPC method failed, trying direct query...');
    
    // Check admin status
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    console.log('Admin check result:', adminCheckData);
    
    // Try a direct query regardless of admin status - this may work if RLS is set up properly
    console.log('Trying direct query for swap requests...');
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*)
      `);
      
    if (!directError && directData && directData.length > 0) {
      console.log(`Direct query successfully fetched ${directData.length} swap requests`);
      
      // Process the data to include embedded shift
      const processedData = directData.map(request => {
        return {
          ...request,
          _embedded_shift: request.requester_shift
        };
      });
      
      console.log('Processed swap requests from direct query:', processedData.length);
      return { data: processedData, error: null };
    } else {
      console.error('Direct query error:', directError);
    }
    
    // If all attempts fail, return an empty array rather than throwing an error
    console.warn('All attempts to fetch swap requests failed, returning empty array');
    return { data: [], error: new Error('Failed to fetch swap requests') };
  } catch (error) {
    console.error('Error in fetchAllSwapRequests:', error);
    return { data: null, error };
  }
};
