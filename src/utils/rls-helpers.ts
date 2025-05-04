
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all swap requests safely bypassing RLS restrictions
 */
export const fetchAllSwapRequestsSafe = async () => {
  const { data, error } = await supabase.rpc('get_all_swap_requests');
  
  if (error) {
    console.error('Error fetching all swap requests:', error);
  }
  
  return { data, error };
};

/**
 * Fetches user swap requests safely bypassing RLS restrictions
 */
export const fetchUserSwapRequestsSafe = async (userId: string, status: string = 'pending') => {
  const { data, error } = await supabase.rpc('get_user_swap_requests_safe', { 
    p_user_id: userId,
    p_status: status
  });
  
  if (error) {
    console.error(`Error fetching user swap requests with status ${status}:`, error);
  }
  
  return { data, error };
};

/**
 * Fetches all preferred dates with their associated requests
 */
export const fetchAllPreferredDatesWithRequestsSafe = async () => {
  const { data, error } = await supabase.rpc('get_all_preferred_dates');
  
  if (error) {
    console.error('Error fetching all preferred dates:', error);
  }
  
  return { data, error };
};

/**
 * Creates a match between two swap requests
 */
export const createSwapMatchSafe = async (request1Id: string, request2Id: string) => {
  // First get shift IDs
  const { data: request1, error: error1 } = await supabase
    .from('shift_swap_requests')
    .select('requester_shift_id')
    .eq('id', request1Id)
    .single();
    
  const { data: request2, error: error2 } = await supabase
    .from('shift_swap_requests')
    .select('requester_shift_id')
    .eq('id', request2Id)
    .single();
    
  if (error1 || error2 || !request1 || !request2) {
    console.error('Error getting request data:', error1 || error2);
    return { error: error1 || error2 };
  }
  
  // Create the match
  const { data, error } = await supabase
    .from('shift_swap_potential_matches')
    .insert({
      requester_request_id: request1Id,
      acceptor_request_id: request2Id,
      requester_shift_id: request1.requester_shift_id,
      acceptor_shift_id: request2.requester_shift_id,
      match_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    })
    .select();
    
  if (error) {
    console.error('Error creating match:', error);
  }
  
  return { data, error };
};

/**
 * Fetches all matches for debug purposes
 */
export const fetchAllMatchesSafe = async () => {
  const { data, error } = await supabase
    .from('shift_swap_potential_matches')
    .select(`
      id,
      status,
      created_at,
      match_date,
      requester_request_id,
      acceptor_request_id,
      requester_shift_id,
      acceptor_shift_id
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching all matches:', error);
  }
  
  return { data, error };
};
