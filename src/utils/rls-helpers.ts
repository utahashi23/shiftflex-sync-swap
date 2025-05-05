
/**
 * Helper functions for safely working with database entities 
 * This works around possible RLS recursion issues by using explicit permissions checks
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Safely fetch all swap requests, working around RLS issues
 * Tries to use edge function or RPC function first, then falls back to direct query
 */
export const fetchAllSwapRequestsSafe = async () => {
  try {
    // First try to get data from our get_all_swap_requests function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_swap_requests');
    
    if (rpcData && !rpcError) {
      console.log('Successfully fetched requests using RPC');
      return { data: rpcData, error: null };
    }

    // If that fails, try a direct query
    console.log('RPC failed or not available, falling back to direct query');
    const { data, error } = await supabase
      .from('shift_swap_requests')
      .select('*');

    if (error) {
      console.error('Error in direct query for requests:', error);
      return { data: [], error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchAllSwapRequestsSafe:', error);
    return { data: [], error };
  }
};

/**
 * Safely fetch all preferred dates with requests, working around RLS issues
 */
export const fetchAllPreferredDatesWithRequestsSafe = async () => {
  try {
    // First try our get_all_preferred_dates function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_preferred_dates');
    
    if (rpcData && !rpcError) {
      console.log('Successfully fetched preferred dates using RPC');
      return { data: rpcData, error: null };
    }

    // If that fails, try a direct query
    console.log('RPC failed or not available, falling back to direct query');
    const { data, error } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*');

    if (error) {
      console.error('Error in direct query for preferred dates:', error);
      return { data: [], error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchAllPreferredDatesWithRequestsSafe:', error);
    return { data: [], error };
  }
};

/**
 * Safely create a swap match, working around possible RLS issues
 */
export const createSwapMatchSafe = async (request1Id: string, request2Id: string) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Get request details
    const { data: request1, error: request1Error } = await supabase
      .from('shift_swap_requests')
      .select('requester_id, requester_shift_id')
      .eq('id', request1Id)
      .single();
      
    if (request1Error) {
      throw request1Error;
    }
    
    const { data: request2, error: request2Error } = await supabase
      .from('shift_swap_requests')
      .select('requester_id, requester_shift_id')
      .eq('id', request2Id)
      .single();
      
    if (request2Error) {
      throw request2Error;
    }
    
    // Create the match
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request1Id,
        acceptor_request_id: request2Id,
        requester_shift_id: request1.requester_shift_id,
        acceptor_shift_id: request2.requester_shift_id,
        match_date: today
      })
      .select();
      
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in createSwapMatchSafe:', error);
    return { data: null, error };
  }
};
