
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Create a new swap request directly using the Supabase client
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
    
    const userId = session.user.id;
    
    // 1. Verify that the shift belongs to the user
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('user_id', userId)
      .single();
      
    if (shiftError || !shiftData) {
      console.error('Shift verification error:', shiftError || 'Shift not found or does not belong to user');
      toast({
        title: "Error",
        description: "You can only request swaps for your own shifts.",
        variant: "destructive"
      });
      throw new Error('You can only request swaps for your own shifts');
    }

    console.log('Shift verified, creating swap request');
    
    // 2. Insert the swap request
    const { data: requestData, error: requestError } = await supabase
      .from('shift_swap_requests')
      .insert({
        requester_id: userId,
        requester_shift_id: shiftId,
        status: 'pending'
      })
      .select('id')
      .single();
      
    if (requestError) {
      console.error('Error creating swap request:', requestError);
      toast({
        title: "Error",
        description: "Failed to create swap request. Please try again.",
        variant: "destructive"
      });
      throw requestError;
    }
    
    const requestId = requestData.id;
    console.log('Created swap request with ID:', requestId);
    
    // 3. Add all preferred dates
    const preferredDaysToInsert = preferredDates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.acceptedTypes || ['day', 'afternoon', 'night']
    }));
    
    console.log('Inserting preferred dates:', preferredDaysToInsert);
    
    const { error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .insert(preferredDaysToInsert);
      
    if (datesError) {
      console.error('Error adding preferred dates:', datesError);
      // Delete the request if we couldn't add preferred dates
      await supabase.from('shift_swap_requests').delete().eq('id', requestId);
      
      toast({
        title: "Error",
        description: "Failed to add preferred dates. Please try again.",
        variant: "destructive"
      });
      throw datesError;
    }

    toast({
      title: "Swap Request Created",
      description: "Your shift swap request has been saved.",
      variant: "default"
    });
    
    return { success: true, requestId };
    
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

/**
 * Delete a swap request
 */
export const deleteSwapRequestApi = async (requestId: string) => {
  if (!requestId) {
    throw new Error('Request ID is required');
  }
  
  try {
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const authToken = session.access_token;
    
    // Use the edge function to safely delete the request
    const response = await supabase.functions.invoke('delete_swap_request', {
      body: { 
        request_id: requestId,
        auth_token: authToken
      }
    });
      
    if (response.error) {
      console.error('Error deleting swap request:', response.error);
      throw response.error;
    }
    
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
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to modify a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const authToken = session.access_token;
    
    // Use the edge function to safely delete a preferred date
    const response = await supabase.functions.invoke('delete_preferred_day', {
      body: { 
        day_id: dayId,
        request_id: requestId,
        auth_token: authToken
      }
    });
      
    if (response.error) {
      console.error('Error deleting preferred date:', response.error);
      throw response.error;
    }
    
    return { 
      success: true, 
      requestDeleted: response.data?.requestDeleted || false 
    };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    throw error;
  }
};
