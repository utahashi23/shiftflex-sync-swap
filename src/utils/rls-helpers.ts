
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

/**
 * Safely fetch all potential matches
 */
export const fetchAllMatchesSafe = async () => {
  try {
    // Try to get all potential matches with RLS bypassed
    console.log('Fetching all potential matches safely');
    
    // Try first with RPC if available
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_potential_matches');
    
    if (!rpcError && rpcData) {
      console.log(`Successfully fetched ${rpcData.length} matches using RPC`);
      return { data: rpcData, error: null };
    }
    
    // If RPC fails, try direct query
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .select('*');
      
    if (error) {
      console.error('Error fetching matches with direct query:', error);
      
      // Last resort, try using edge function if available
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          const response = await supabase.functions.invoke('get_all_matches', {
            body: {
              auth_token: sessionData.session.access_token
            }
          });
          
          if (!response.error && response.data) {
            console.log(`Successfully fetched ${response.data.length} matches using edge function`);
            return { data: response.data, error: null };
          }
        }
      } catch (edgeFnError) {
        console.error('Error in edge function for matches:', edgeFnError);
      }
      
      return { data: [], error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchAllMatchesSafe:', error);
    return { data: [], error };
  }
};

/**
 * Safely fetch swap requests for a specific user
 * Will try to use edge function first, then fall back to direct query
 */
export const fetchUserSwapRequestsSafe = async (userId: string, status: string = 'pending') => {
  try {
    console.log(`Fetching swap requests for user ${userId} with status ${status}`);
    
    // Try to use the edge function first
    const { data: session } = await supabase.auth.getSession();
    
    if (session?.session?.access_token) {
      try {
        console.log('Trying to fetch user requests using edge function');
        const response = await supabase.functions.invoke('get_swap_requests', {
          body: {
            user_id: userId,
            status: status,
            auth_token: session.session.access_token
          }
        });
        
        if (!response.error && response.data) {
          console.log(`Successfully fetched ${response.data.length} user requests using edge function`);
          return { data: response.data, error: null };
        }
      } catch (e) {
        console.log('Edge function failed, falling back to RPC');
      }
    }
    
    // Try RPC function next
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_swap_requests_safe', {
      p_user_id: userId,
      p_status: status
    });
    
    if (!rpcError && rpcData) {
      console.log(`Successfully fetched ${rpcData.length} user requests using RPC`);
      return { data: rpcData, error: null };
    }
    
    // Fall back to direct query as last resort
    console.log('RPC failed, falling back to direct query');
    const { data, error } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        shifts:requester_shift_id(*),
        preferred_dates:shift_swap_preferred_dates(*)
      `)
      .eq('requester_id', userId)
      .eq('status', status);
      
    if (error) {
      console.error('Error in direct query for user requests:', error);
      return { data: [], error };
    }
    
    // Format the data to match the expected structure
    const formattedData = data?.map(item => ({
      ...item,
      shift: item.shifts,
      preferred_dates: item.preferred_dates
    }));
    
    console.log(`Successfully fetched ${formattedData?.length || 0} user requests using direct query`);
    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error in fetchUserSwapRequestsSafe:', error);
    return { data: [], error };
  }
};
