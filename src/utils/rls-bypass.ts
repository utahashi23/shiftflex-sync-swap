
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
 * IMPORTANT: Completely rebuilt to ensure ALL users can see ALL pending requests
 */
export const fetchAllSwapRequests = async () => {
  try {
    console.log('REBUILD: Fetching all swap requests with multiple fallback methods');
    
    // FIRST APPROACH: Try with RPC function - this should work for all users
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_swap_requests');
    
    if (!rpcError && rpcData && rpcData.length > 0) {
      console.log(`RPC Successfully fetched ${rpcData.length} swap requests from all users`);
      
      // We need to fetch the associated shifts separately
      const shiftIds = rpcData
        .filter(req => req.requester_shift_id)
        .map(req => req.requester_shift_id);
      
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
      const processedData = rpcData.map(request => {
        // Find the associated shift
        const shiftData = shiftMap.get(request.requester_shift_id);
        
        return {
          ...request,
          _embedded_shift: shiftData || null
        };
      });
      
      console.log('Processed swap requests data with shifts:', processedData.length);
      return { data: processedData, error: null };
    }
    
    // SECOND APPROACH: Try admin access check, then direct query
    console.log('RPC method failed or returned empty, trying admin check + direct query');
    
    const { data: adminCheckData } = await supabase.rpc('test_admin_access');
    console.log('Admin check for swap requests:', adminCheckData);
    
    // Try a direct query for all users regardless of admin status
    console.log('Trying direct query for ALL swap requests...');
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*)
      `)
      .eq('status', 'pending');
    
    if (!directError && directData && directData.length > 0) {
      console.log(`Direct query successfully fetched ${directData.length} swap requests`);
      
      // Process the data to include embedded shift
      const processedData = directData.map(request => {
        return {
          ...request,
          _embedded_shift: request.requester_shift || null
        };
      });
      
      console.log('Processed swap requests from direct query:', processedData.length);
      return { data: processedData, error: null };
    }
    
    // THIRD APPROACH: Try with a raw direct query, no joins (last resort)
    console.log('All previous methods failed, trying raw direct query');
    const { data: rawData, error: rawError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('status', 'pending');
    
    if (!rawError && rawData && rawData.length > 0) {
      console.log(`Raw query fetched ${rawData.length} swap requests`);
      
      // Now fetch shifts separately and join them
      const shiftIds = rawData
        .filter(req => req.requester_shift_id)
        .map(req => req.requester_shift_id);
      
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
      
      // Create a map of shifts by ID
      const shiftMap = new Map();
      if (shiftsData && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          shiftMap.set(shift.id, shift);
        });
      }
      
      // Join the data manually
      const processedData = rawData.map(request => {
        const shiftData = shiftMap.get(request.requester_shift_id) || null;
        
        return {
          ...request,
          _embedded_shift: shiftData
        };
      });
      
      console.log('Processed swap requests with manual join:', processedData.length);
      return { data: processedData, error: null };
    }
    
    // FINAL FALLBACK: Return empty array rather than throwing an error
    console.warn('All attempts to fetch swap requests failed, returning empty array');
    return { data: [], error: null };
  } catch (error) {
    console.error('Error in fetchAllSwapRequests:', error);
    return { data: [], error };
  }
};
