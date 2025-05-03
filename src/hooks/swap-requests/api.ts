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
    console.log('Creating swap request using RPC function for shift:', shiftId);
    
    // Use the RPC function to create swap request safely (avoids RLS recursion)
    const { data: requestId, error: requestError } = await supabase.rpc(
      'create_swap_request_safe',
      {
        p_requester_shift_id: shiftId,
        p_status: 'pending'
      }
    );
      
    if (requestError) {
      console.error('Error creating swap request with RPC:', requestError);
      throw requestError;
    }
    
    console.log('Created swap request with ID:', requestId);
    
    // Add all preferred dates
    const preferredDatesToInsert = preferredDates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.acceptedTypes || []
    }));
    
    console.log('Adding preferred dates:', preferredDatesToInsert);
    
    const { error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .insert(preferredDatesToInsert);
    
    if (datesError) {
      console.error('Error adding preferred dates:', datesError);
      
      // Clean up the request if adding dates failed
      await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId);
        
      throw datesError;
    }
    
    return { success: true, requestId };
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
    // Delete all preferred dates for this request first
    const { error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('request_id', requestId);
      
    if (datesError) throw datesError;
    
    // Then delete the request
    const { error: requestError } = await supabase
      .from('shift_swap_requests')
      .delete()
      .eq('id', requestId);
      
    if (requestError) throw requestError;
    
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
    // Delete the preferred date
    const { error: deleteError } = await supabase
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('id', dayId);
      
    if (deleteError) throw deleteError;
    
    // Check if any preferred dates remain
    const { data: remainingDays, error: countError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('id')
      .eq('request_id', requestId);
      
    if (countError) throw countError;
    
    // If no dates left, delete the request too
    if (!remainingDays || remainingDays.length === 0) {
      const { error: requestError } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId);
        
      if (requestError) throw requestError;
      
      return { success: true, requestDeleted: true };
    }
    
    return { success: true, requestDeleted: false };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    throw error;
  }
};
