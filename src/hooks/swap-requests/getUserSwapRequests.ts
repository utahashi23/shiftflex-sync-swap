
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';

/**
 * Safely fetches a user's swap requests using an edge function to bypass RLS issues
 */
export const getUserSwapRequestsApi = async (status: string = 'pending'): Promise<SwapRequest[]> => {
  try {
    // Get the current session to pass the auth token
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      console.error('No active session found');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to view swap requests.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const userId = sessionData.session.user.id;
    
    // Important: Use the invoke method without passing the auth_token in the body
    // The token is automatically included in the request headers by the SDK
    const response = await supabase.functions.invoke('get_swap_requests', {
      body: { 
        user_id: userId,
        status: status
      },
      // Explicitly add authorization header with bearer token
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });
      
    if (response.error) {
      console.error('Error fetching swap requests:', response.error);
      throw response.error;
    }
    
    // Process the response data to match the SwapRequest format
    const swapRequests: SwapRequest[] = (response.data || []).map((item: any) => {
      const shift = item.shift;
      const preferredDates = item.preferred_dates || [];
      
      if (!shift) return null;
      
      // Format preferred dates
      const formattedDates = preferredDates.map((date: any) => ({
        id: date.id,
        date: date.date,
        acceptedTypes: date.accepted_types as ("day" | "afternoon" | "night")[]
      }));
      
      return {
        id: item.id,
        requesterId: item.requester_id,
        status: item.status,
        originalShift: {
          id: shift.id,
          date: shift.date,
          title: shift.truckName || `Shift-${shift.id.substring(0, 5)}`,
          startTime: shift.startTime?.substring(0, 5) || "",
          endTime: shift.endTime?.substring(0, 5) || "",
          type: shift.type
        },
        preferredDates: formattedDates
      };
    }).filter(Boolean) as SwapRequest[];
    
    return swapRequests;
  } catch (error) {
    console.error('Error in getUserSwapRequestsApi:', error);
    throw error;
  }
};
