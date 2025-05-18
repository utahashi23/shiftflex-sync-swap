
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Create new swap requests using the edge function
 */
export const createSwapRequestApi = async (
  shiftIds: string[], 
  preferredDates: { date: string, acceptedTypes: string[] }[]
) => {
  if (!shiftIds || shiftIds.length === 0 || !preferredDates || preferredDates.length === 0) {
    throw new Error('Missing required parameters for swap request');
  }
  
  try {
    console.log('Creating swap requests for shifts:', shiftIds);
    console.log('With preferred dates:', preferredDates);
    
    // Call the Supabase edge function
    const { data, error } = await supabase.functions.invoke('create_swap_request', {
      body: { 
        shift_ids: shiftIds,
        preferred_dates: preferredDates
      }
    });
    
    if (error) {
      console.error('Error creating swap request:', error);
      throw error;
    }
    
    toast({
      title: "Swap Request Created",
      description: `${data.request_ids.length} swap request(s) have been saved.`,
      variant: "default"
    });
    
    return { success: true, requestIds: data.request_ids };
    
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
