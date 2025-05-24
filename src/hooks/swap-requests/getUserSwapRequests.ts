
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';

/**
 * Safely fetches a user's swap requests using an edge function to bypass RLS issues
 */
export const getUserSwapRequestsApi = async (status: string = 'pending'): Promise<SwapRequest[]> => {
  try {
    // Get the current session to pass the auth token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('No active session found:', sessionError);
      toast({
        title: "Authentication Error",
        description: "You must be logged in to view swap requests.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const userId = sessionData.session.user.id;
    const authToken = sessionData.session.access_token;
    
    console.log('Calling edge function with user ID:', userId);
    
    // Call the edge function with proper authentication headers
    const response = await supabase.functions.invoke('get_swap_requests', {
      body: { 
        user_id: userId,
        status: status
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
      
    if (response.error) {
      console.error('Edge function error:', response.error);
      throw new Error(response.error.message || 'Failed to fetch swap requests');
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
        preferredDates: formattedDates,
        // Add these properties for compatibility with the filtering
        wanted_date: shift.date,
        shifts: {
          truck_name: shift.truckName
        },
        accepted_shift_types: item.accepted_shift_types || ['day', 'afternoon', 'night']
      };
    }).filter(Boolean) as SwapRequest[];
    
    console.log('Successfully processed swap requests:', swapRequests.length);
    return swapRequests;
  } catch (error) {
    console.error('Error in getUserSwapRequestsApi:', error);
    throw error;
  }
};
