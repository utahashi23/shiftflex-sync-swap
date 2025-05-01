
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all shifts from all users, bypassing RLS
 * This is necessary for admins to see and match shifts across users
 */
export const fetchAllShifts = async () => {
  try {
    console.log('Attempting to fetch ALL shifts using RPC function...');
    
    // Try with our RPC function first (most reliable)
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
    
    // Fall back to direct query with explicit admin check
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    const isAdmin = adminCheckData?.is_admin === true;
    
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
    
    // Fall back to admin check
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    const isAdmin = adminCheckData?.is_admin === true;
    
    if (isAdmin) {
      console.log('Admin access confirmed, trying direct query...');
      // For preferred dates, we'll try an extended query first
      const { data: extendedData, error: extendedError } = await supabase
        .from('shift_swap_preferred_dates')
        .select(`
          *,
          shift_swap_requests!inner (
            id,
            requester_id,
            requester_shift_id
          )
        `);
        
      if (!extendedError && extendedData && extendedData.length > 0) {
        console.log(`Extended query fetched ${extendedData.length} preferred dates`);
        
        // Extract just the preferred dates data without the joined fields
        const cleanedData = extendedData.map(item => ({
          id: item.id,
          request_id: item.request_id,
          date: item.date,
          shift_id: item.shift_id,
          accepted_types: item.accepted_types,
          created_at: item.created_at
        }));
        
        return { data: cleanedData, error: null };
      }
      
      console.log('Extended query failed, trying simple direct query');
      
      // Try simple direct query as last resort
      const { data: simpleData, error: simpleError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*');
        
      if (!simpleError && simpleData && simpleData.length > 0) {
        console.log(`Simple direct query fetched ${simpleData.length} preferred dates`);
        return { data: simpleData, error: null };
      }
      
      console.error('All admin queries failed:', simpleError || extendedError);
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
 * Also including the shift data directly in the request to prevent "missing shift" errors
 */
export const fetchAllSwapRequests = async () => {
  try {
    // Start with RPC function since All Swap Requests is already working correctly
    console.log('Fetching all swap requests with working RPC method...');
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
      
      return { data: processedData, error: null };
    }
    
    // If RPC fails, try direct query with joins as fallback
    console.log('RPC method failed, trying direct join query...');
    
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*)
      `);
      
    if (!directError && directData) {
      console.log(`Direct query successfully fetched ${directData.length} swap requests`);
      
      // Process the data to include embedded shift
      const processedData = directData.map(request => {
        return {
          ...request,
          _embedded_shift: request.requester_shift
        };
      });
      
      return { data: processedData, error: null };
    }
    
    console.error('All attempts to fetch swap requests failed');
    return { data: [], error: new Error('Failed to fetch swap requests') };
  } catch (error) {
    console.error('Error in fetchAllSwapRequests:', error);
    return { data: null, error };
  }
};
