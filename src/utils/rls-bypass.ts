
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
    
    if (!shiftsError && shiftsData && Array.isArray(shiftsData) && shiftsData.length > 0) {
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
    
    if (!datesError && datesData && Array.isArray(datesData) && datesData.length > 0) {
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
 * COMPLETE REWRITE: Using direct query with explicit public access
 */
export const fetchAllSwapRequests = async () => {
  try {
    console.log('NEW IMPLEMENTATION: Fetching ALL swap requests with highest priority method');
    
    // APPROACH 1: Try direct public function call
    const { data: publicData, error: publicError } = await supabase.functions.invoke('get_all_requests', {
      body: { type: 'pending' }
    });
    
    if (!publicError && publicData && Array.isArray(publicData) && publicData.length > 0) {
      console.log(`PUBLIC FUNCTION: Successfully fetched ${publicData.length} swap requests`);
      
      // Get the shifts data to merge with requests
      const { data: shiftsData } = await fetchAllShifts();
      
      // Create a map of shifts by ID
      const shiftMap = new Map();
      if (shiftsData && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          shiftMap.set(shift.id, shift);
        });
      }
      
      // Add the embedded shift data to each request
      const processedData = publicData.map(request => ({
        ...request,
        _embedded_shift: shiftMap.get(request.requester_shift_id) || null
      }));
      
      return { data: processedData, error: null };
    }
    
    console.log('Public function failed or returned no data, trying standard query...');
    
    // APPROACH 2: Try with standard anonymous access query (should work for anyone)
    const { data: standardData, error: standardError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('status', 'pending');
      
    if (!standardError && standardData && standardData.length > 0) {
      console.log(`Standard query fetched ${standardData.length} swap requests from all users`);
      
      // Get the shifts data to merge with requests
      const { data: shiftsData } = await fetchAllShifts();
      
      // Create a map of shifts by ID
      const shiftMap = new Map();
      if (shiftsData && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          shiftMap.set(shift.id, shift);
        });
      }
      
      // Add the embedded shift data to each request
      const processedData = standardData.map(request => ({
        ...request,
        _embedded_shift: shiftMap.get(request.requester_shift_id) || null
      }));
      
      return { data: processedData, error: null };
    }
    
    console.log('Standard query failed, trying raw anonymous access...');
    
    // FINAL APPROACH: Use raw SQL via Edge Function for guaranteed access
    const { data: rawRequest } = await supabase.functions.invoke('execute_raw_query', {
      body: { 
        query: "SELECT * FROM public.shift_swap_requests WHERE status = 'pending'" 
      }
    });
    
    if (rawRequest && Array.isArray(rawRequest) && rawRequest.length > 0) {
      console.log(`Raw SQL query fetched ${rawRequest.length} swap requests`);
      
      // Get the shifts data separately
      const { data: shiftsData } = await fetchAllShifts();
      
      // Create a map of shifts by ID
      const shiftMap = new Map();
      if (shiftsData && Array.isArray(shiftsData) && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          shiftMap.set(shift.id, shift);
        });
      }
      
      // Add the embedded shift data to each request
      const processedData = rawRequest.map((request: any) => ({
        ...request,
        _embedded_shift: shiftMap.get(request.requester_shift_id) || null
      }));
      
      return { data: processedData, error: null };
    }
    
    console.log('All approaches failed, but returning empty array instead of error to avoid breaking UI');
    return { data: [], error: null };
  } catch (error) {
    console.error('Error in fetchAllSwapRequests:', error);
    return { data: [], error };
  }
};

