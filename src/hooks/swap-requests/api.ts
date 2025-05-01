
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Fetches swap requests directly from the database instead of using the edge function
 * This avoids potential RLS policy recursion issues
 * @param userId The user ID to fetch swap requests for
 * @param status The status of the swap requests to fetch
 */
export const fetchSwapRequestsApi = async (userId: string, status: string = 'pending') => {
  if (!userId) {
    console.error('Invalid userId provided to fetchSwapRequestsApi:', userId);
    throw new Error('User ID is required to fetch swap requests');
  }
  
  console.log('Fetching swap requests for user:', userId);
  
  try {
    // Direct database query instead of edge function
    const { data: requests, error: requestsError } = await supabase
      .from('shift_swap_requests')
      .select('id, status, requester_shift_id, created_at, requester_id')
      .eq('requester_id', userId)
      .eq('status', status);

    if (requestsError) throw requestsError;
    
    console.log(`Found ${requests?.length || 0} swap requests`);
    
    if (!requests || requests.length === 0) {
      return [];
    }
    
    // Get all the shift IDs from the requests
    const shiftIds = requests
      .filter(req => req && req.requester_shift_id)
      .map(req => req.requester_shift_id);
    
    if (shiftIds.length === 0) {
      console.log('No valid shift IDs found in requests');
      return [];
    }
    
    // Fetch the shift details
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (shiftsError) throw shiftsError;
    
    if (!shifts || shifts.length === 0) {
      console.log('No shifts found for the request shift IDs');
      return [];
    }
    
    // Create a lookup for easy access
    const shiftMap = shifts.reduce((acc, shift) => {
      acc[shift.id] = shift;
      return acc;
    }, {} as Record<string, any>);
    
    // Fetch the preferred dates for all requests
    const requestIds = requests.map(req => req.id);
    const { data: preferredDates, error: datesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (datesError) throw datesError;
    
    console.log('Fetched preferred dates:', preferredDates?.length || 0);
    
    // Format and return the requests
    return requests.map(request => {
      const shift = shiftMap[request.requester_shift_id];
      
      // Skip requests without a valid shift
      if (!shift) return null;
      
      // Determine shift type based on start time
      const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
      let shiftType: "day" | "afternoon" | "night";
      
      if (startHour <= 8) {
        shiftType = 'day';
      } else if (startHour > 8 && startHour < 16) {
        shiftType = 'afternoon';
      } else {
        shiftType = 'night';
      }
      
      // Get preferred dates for this request
      const requestPreferredDates = (preferredDates || [])
        .filter(pd => pd.request_id === request.id)
        .map(pd => ({
          id: pd.id,
          date: pd.date,
          acceptedTypes: pd.accepted_types as ("day" | "afternoon" | "night")[]
        }));
      
      return {
        id: request.id,
        requesterId: request.requester_id,
        status: request.status,
        originalShift: {
          id: shift.id,
          date: shift.date,
          title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
          startTime: shift.start_time.substring(0, 5),
          endTime: shift.end_time.substring(0, 5),
          type: shiftType
        },
        preferredDates: requestPreferredDates
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    throw error;
  }
};

/**
 * Deletes a swap request
 * @param requestId The ID of the request to delete
 */
export const deleteSwapRequestApi = async (requestId: string) => {
  if (!requestId) {
    console.error('Invalid requestId provided to deleteSwapRequestApi:', requestId);
    throw new Error('Request ID is required to delete a swap request');
  }
  
  console.log('Deleting swap request:', requestId);
  
  const { data, error } = await supabase.functions.invoke('delete_swap_request', {
    body: { request_id: requestId }
  });
  
  if (error) throw error;
  
  return data;
};

/**
 * Deletes a preferred day from a swap request
 * @param dayId The ID of the preferred day to delete
 * @param requestId The ID of the request the day belongs to
 */
export const deletePreferredDayApi = async (dayId: string, requestId: string) => {
  if (!dayId || !requestId) {
    console.error('Invalid parameters provided to deletePreferredDayApi:', { dayId, requestId });
    throw new Error('Day ID and Request ID are required to delete a preferred day');
  }
  
  console.log('Deleting preferred day:', dayId, 'from request:', requestId);
  
  const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
    body: { day_id: dayId, request_id: requestId }
  });
  
  if (error) throw error;
  
  return data;
};
