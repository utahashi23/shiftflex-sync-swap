
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to safely fetch swap requests without RLS recursion
 * Using the custom server function that avoids RLS recursion issues
 */
export const fetchUserSwapRequestsSafe = async (userId: string, status: string = 'pending') => {
  try {
    console.log(`Fetching swap requests for user ${userId} with status ${status} using RPC function`);
    
    // Using an RPC function that has SECURITY DEFINER to bypass RLS
    const { data, error } = await supabase.rpc(
      'get_user_swap_requests_safe',
      { p_user_id: userId, p_status: status }
    );
    
    if (error) {
      console.error('Error in fetchUserSwapRequestsSafe:', error);
      throw error;
    }
    
    console.log('RPC function returned swap requests:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchUserSwapRequestsSafe:', error);
    return { data: null, error };
  }
};

/**
 * Helper function to check a user's admin status safely
 */
export const checkAdminStatus = async (userId: string) => {
  try {
    const { data, error } = await supabase.rpc('has_role', { 
      _user_id: userId,
      _role: 'admin'
    });
    
    if (error) throw error;
    
    return { isAdmin: !!data, error: null };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isAdmin: false, error };
  }
};

// Additional helper to fetch all swap requests for an admin safely
export const fetchAllSwapRequestsSafe = async () => {
  try {
    // Using the RPC function that has SECURITY DEFINER to bypass RLS
    const { data, error } = await supabase.rpc('get_all_swap_requests');
    
    if (error) {
      console.error('Error in fetchAllSwapRequestsSafe:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchAllSwapRequestsSafe:', error);
    return { data: null, error };
  }
};

/**
 * Helper function to fetch a specific swap request by ID safely
 */
export const fetchSwapRequestByIdSafe = async (requestId: string) => {
  try {
    // Using a function with SECURITY DEFINER to bypass RLS
    // Cast the function name to any to bypass TypeScript's strict checking
    // since the function exists in the database but not in TypeScript definitions
    const { data, error } = await supabase.rpc(
      'get_swap_request_by_id' as any,
      { p_request_id: requestId }
    );
    
    if (error) {
      console.error('Error in fetchSwapRequestByIdSafe:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in fetchSwapRequestByIdSafe:', error);
    return { data: null, error };
  }
};
