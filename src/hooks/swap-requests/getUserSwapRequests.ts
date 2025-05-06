
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';

/**
 * Safely fetches a user's swap requests with fallback options
 */
export const getUserSwapRequestsApi = async (status: string = 'pending'): Promise<SwapRequest[]> => {
  try {
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to view swap requests.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const userId = session.user.id;
    
    // Try three different methods to get the data, starting with the most preferred method
    
    // Method 1: Use the RPC function (most reliable)
    try {
      console.log('Attempting to fetch swap requests using RPC function...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_swap_requests_safe', {
        p_user_id: userId,
        p_status: status
      });
      
      if (!rpcError && rpcData) {
        console.log(`Successfully fetched ${rpcData.length} swap requests using RPC function`);
        return formatSwapRequests(rpcData);
      }
      
      console.log('RPC function returned error or no data:', rpcError);
    } catch (rpcException) {
      console.error('Exception during RPC function call:', rpcException);
    }
    
    // Method 2: Try the edge function
    try {
      console.log('Attempting to fetch swap requests using Edge function...');
      const authToken = session.access_token;
      
      const response = await supabase.functions.invoke('get_swap_requests', {
        body: { 
          user_id: userId,
          status: status,
          auth_token: authToken
        }
      });
        
      if (!response.error && response.data) {
        console.log(`Successfully fetched ${response.data.length} swap requests using Edge function`);
        return formatSwapRequests(response.data);
      }
      
      console.log('Edge function returned error or no data:', response.error);
    } catch (edgeFnException) {
      console.error('Exception during Edge function call:', edgeFnException);
    }
    
    // Method 3: Last resort - direct query (might work if RLS is configured correctly)
    console.log('Attempting direct query for swap requests...');
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select(`
        *,
        shifts:requester_shift_id(
          id,
          date,
          start_time,
          end_time,
          truck_name
        ),
        preferred_dates:shift_swap_preferred_dates(
          id,
          date,
          accepted_types
        )
      `)
      .eq('requester_id', userId)
      .eq('status', status);
    
    if (directError) {
      console.error('Direct query failed:', directError);
      throw directError;
    }
    
    if (!directData || directData.length === 0) {
      console.log('No swap requests found using direct query');
      return [];
    }
    
    console.log(`Successfully fetched ${directData.length} swap requests using direct query`);
    return formatSwapRequestsFromDirect(directData);
    
  } catch (error) {
    console.error('Error in getUserSwapRequestsApi:', error);
    
    // Show a toast only for non-edge function errors (since we handle those separately)
    if (!(error instanceof Error && error.message.includes('Edge Function'))) {
      toast({
        title: "Error Loading Swap Requests",
        description: "There was a problem fetching your swap requests. Please try again.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
};

// Helper function to format swap requests from RPC or Edge function response
const formatSwapRequests = (data: any[]): SwapRequest[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.map((item: any) => {
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
        type: getShiftType(shift.startTime)
      },
      preferredDates: formattedDates
    };
  }).filter(Boolean) as SwapRequest[];
};

// Helper function to format swap requests from direct query
const formatSwapRequestsFromDirect = (data: any[]): SwapRequest[] => {
  return data.map(item => {
    const shift = item.shifts;
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
        title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
        startTime: shift.start_time?.substring(0, 5) || "",
        endTime: shift.end_time?.substring(0, 5) || "",
        type: getShiftType(shift.start_time)
      },
      preferredDates: formattedDates
    };
  }).filter(Boolean) as SwapRequest[];
};

// Helper function to determine shift type based on start time
const getShiftType = (startTime?: string): string => {
  if (!startTime) return "day";
  
  const hour = parseInt(startTime.split(':')[0], 10);
  
  if (hour <= 8) return "day";
  if (hour > 8 && hour < 16) return "afternoon";
  return "night";
};
