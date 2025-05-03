
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to safely fetch swap requests without RLS recursion
 * Using the custom server function that avoids RLS recursion issues
 */
export const fetchUserSwapRequestsSafe = async (userId: string, status: string = 'pending') => {
  try {
    const { data, error } = await supabase.rpc(
      'get_user_swap_requests_safe',
      { p_user_id: userId, p_status: status }
    );
    
    if (error) throw error;
    
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
