
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Create a new swap request directly using Supabase client
 */
export const createSwapRequestApi = async (
  shiftId: string, 
  preferredDates: { date: string, acceptedTypes: string[] }[]
) => {
  if (!shiftId || !preferredDates || preferredDates.length === 0) {
    throw new Error('Missing required parameters for swap request');
  }
  
  try {
    console.log('Creating swap request with preferred dates:', preferredDates);
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const userId = session.user.id;
    
    // First create a swap request to get an ID
    const { data: swapRequest, error: swapRequestError } = await supabase
      .from('shift_swap_requests')
      .insert({
        requester_id: userId,
        requester_shift_id: shiftId,
        status: 'pending'
      })
      .select('id')
      .single();
      
    if (swapRequestError) {
      console.error('Error creating swap request:', swapRequestError);
      throw swapRequestError;
    }
    
    if (!swapRequest || !swapRequest.id) {
      throw new Error('Failed to create swap request');
    }
    
    console.log('Created swap request with ID:', swapRequest.id);
    
    // Now store each preferred date with the request_id
    const preferredDaysToInsert = preferredDates.map(pd => ({
      request_id: swapRequest.id,
      date: pd.date,
      accepted_types: pd.acceptedTypes
    }));
    
    const { error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .insert(preferredDaysToInsert);
      
    if (datesError) {
      console.error('Error adding preferred dates:', datesError);
      // Clean up by deleting the request if we couldn't add preferred dates
      await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', swapRequest.id);
      
      throw datesError;
    }
    
    toast({
      title: "Swap Request Created",
      description: "Your shift swap request has been saved.",
      variant: "default"
    });
    
    return { success: true, requestId: swapRequest.id };
    
  } catch (error) {
    console.error('Error creating swap request:', error);
    
    toast({
      title: "Error Saving Request",
      description: "There was a problem saving your swap request.",
      variant: "destructive"
    });
    
    throw error;
  }
};
