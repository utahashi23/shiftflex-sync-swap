
import { supabase } from '@/integrations/supabase/client';

/**
 * Create a new swap request using the safe RPC function
 */
export const createSwapRequestApi = async (
  shiftId: string, 
  preferredDates: { date: string, acceptedTypes: string[] }[]
) => {
  if (!shiftId || !preferredDates || preferredDates.length === 0) {
    throw new Error('Missing required parameters for swap request');
  }
  
  try {
    console.log('Creating swap request using edge function for shift:', shiftId);
    
    // Use the edge function to handle the entire process safely
    const { data, error } = await supabase.functions.invoke('create_swap_request', {
      body: {
        shift_id: shiftId,
        preferred_dates: preferredDates
      }
    });
    
    if (error) {
      console.error('Error creating swap request:', error);
      throw error;
    }
    
    console.log('Swap request created successfully:', data);
    return { success: true, requestId: data?.request_id };
    
  } catch (error) {
    console.error('Error creating swap request:', error);
    throw error;
  }
};

/**
 * Delete a swap request
 */
export const deleteSwapRequestApi = async (requestId: string) => {
  if (!requestId) {
    throw new Error('Request ID is required');
  }
  
  try {
    // Use the edge function to safely delete the request
    const { data, error } = await supabase.functions.invoke('delete_swap_request', {
      body: { request_id: requestId }
    });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting swap request:', error);
    throw error;
  }
};

/**
 * Delete a preferred date from a swap request
 */
export const deletePreferredDateApi = async (dayId: string, requestId: string) => {
  if (!dayId || !requestId) {
    throw new Error('Day ID and Request ID are required');
  }
  
  try {
    // Use the edge function to safely delete a preferred date
    const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
      body: { 
        day_id: dayId,
        request_id: requestId
      }
    });
      
    if (error) throw error;
    
    return { 
      success: true, 
      requestDeleted: data?.requestDeleted || false 
    };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    throw error;
  }
};
