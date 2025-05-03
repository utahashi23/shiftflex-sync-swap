
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
    
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const authToken = session.access_token;
    console.log('Got auth token, length:', authToken?.length);
    
    // Use the edge function to handle the entire process safely
    const response = await supabase.functions.invoke('create_swap_request', {
      body: {
        shift_id: shiftId,
        preferred_dates: preferredDates,
        auth_token: authToken
      }
    });
    
    // Check for errors in the response
    if (response.error) {
      console.error('Error creating swap request:', response.error);
      throw response.error;
    }
    
    // Check for data errors or failed status
    const data = response.data;
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error occurred';
      console.error('Error in response data:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Show warning if there is one
    if (data.warning) {
      console.warn('Warning:', data.warning);
      toast({
        title: "Swap Request Created",
        description: "Request created but there was an issue with preferred dates. Please try adding them again.",
        variant: "default" // Changed from "warning" to "default" as warning is not a supported variant
      });
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
