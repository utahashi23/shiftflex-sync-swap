
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Create a new swap request using the edge function
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
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    // Get the auth token
    const authToken = session.access_token;
    console.log('Got auth token, length:', authToken.length);
    
    // Use the edge function to create the swap request
    console.log('Creating swap request using edge function for shift:', shiftId);
    
    const { data, error } = await supabase.functions.invoke('create_swap_request', {
      body: { 
        shift_id: shiftId,
        preferred_dates: preferredDates
      }
    });

    if (error) {
      console.error('Error creating swap request:', error);
      toast({
        title: "Error",
        description: "Failed to create swap request. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
    
    toast({
      title: "Swap Request Created",
      description: "Your shift swap request has been saved.",
      variant: "default"
    });
    
    return { success: true, requestId: data.request_id };
    
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
