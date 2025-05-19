
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Define the expected type for preferred dates
interface PreferredDate {
  date: string;
  acceptedTypes: string[];
}

/**
 * Create new swap requests using the edge function
 */
export const createSwapRequestApi = async (
  shiftIds: string[], 
  preferredDates: PreferredDate[],
  requiredSkillsets?: string[]
) => {
  if (!shiftIds || shiftIds.length === 0 || !preferredDates || preferredDates.length === 0) {
    throw new Error('Missing required parameters for swap request');
  }
  
  try {
    console.log('Creating swap requests for shifts:', shiftIds);
    console.log('With preferred dates:', preferredDates);
    console.log('With required skillsets:', requiredSkillsets || 'None');
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const requestIds = [];
    
    // For each shift, create a swap request
    for (const shiftId of shiftIds) {
      // Process each preferred date
      for (const preferredDate of preferredDates) {
        // Create the swap request in improved_shift_swaps table
        const { data: swapRequest, error } = await supabase
          .from('improved_shift_swaps')
          .insert({
            requester_id: user.id,
            requester_shift_id: shiftId,
            wanted_date: preferredDate.date,
            accepted_shift_types: preferredDate.acceptedTypes,
            required_skillsets: requiredSkillsets || [],
            status: 'pending'
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error creating swap request:', error);
          continue;
        }
        
        console.log(`Created swap request with ID: ${swapRequest.id}`);
        requestIds.push(swapRequest.id);
        
        // Also create the wanted date in improved_swap_wanted_dates table
        const { error: dateError } = await supabase
          .from('improved_swap_wanted_dates')
          .insert({
            swap_id: swapRequest.id,
            date: preferredDate.date
          });
          
        if (dateError) {
          console.error('Error adding wanted date:', dateError);
        }
      }
    }
    
    if (requestIds.length > 0) {
      toast({
        title: "Swap Request Created",
        description: `${requestIds.length} swap request(s) have been saved.`,
        variant: "default"
      });
      
      return { success: true, requestIds };
    } else {
      throw new Error('Failed to create any swap requests');
    }
    
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
