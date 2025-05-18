
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all data needed for swap matching
 */
export const fetchAllData = async () => {
  try {
    // Fetch swap requests
    const { data: swapRequests, error: swapRequestsError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('status', 'pending');
    
    if (swapRequestsError) {
      console.error('Error fetching swap requests:', swapRequestsError);
      return { 
        success: false, 
        error: 'Failed to fetch swap requests: ' + swapRequestsError.message 
      };
    }

    // Fetch preferred dates
    const { data: preferredDates, error: preferredDatesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*');
    
    if (preferredDatesError) {
      console.error('Error fetching preferred dates:', preferredDatesError);
      return { 
        success: false, 
        error: 'Failed to fetch preferred dates: ' + preferredDatesError.message 
      };
    }

    // Fetch shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'scheduled');
    
    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return { 
        success: false, 
        error: 'Failed to fetch shifts: ' + shiftsError.message 
      };
    }

    return {
      success: true,
      swapRequests: swapRequests || [],
      preferredDates: preferredDates || [],
      shifts: shifts || []
    };
  } catch (error: any) {
    console.error('Error in fetchAllData:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred while fetching data'
    };
  }
};
