
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';

/**
 * Fetch all swap requests for the current user
 */
export const getSwapRequestsApi = async (): Promise<SwapRequest[]> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get swap requests for the current user
    const { data: swapRequests, error } = await supabase
      .from('improved_shift_swaps')
      .select('*, shifts:requester_shift_id(*)')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // For each swap request, get the preferred dates
    const swapRequestsWithDates = await Promise.all((swapRequests || []).map(async (request) => {
      const { data: preferredDates, error: datesError } = await supabase
        .from('improved_swap_wanted_dates')
        .select('*')
        .eq('swap_id', request.id);
      
      if (datesError) {
        console.error(`Error fetching preferred dates for request ${request.id}:`, datesError);
        return {
          ...request,
          preferredDates: []
        };
      }
      
      return {
        ...request,
        preferredDates: preferredDates || []
      };
    }));
    
    return swapRequestsWithDates;
    
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    
    toast({
      title: "Error",
      description: "There was a problem loading your swap requests.",
      variant: "destructive"
    });
    
    return [];
  }
};
