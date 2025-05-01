
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Fetches swap requests from the edge function
 * @param userId The user ID to fetch swap requests for
 * @param status The status of the swap requests to fetch
 */
export const fetchSwapRequestsApi = async (userId: string, status: string = 'pending') => {
  console.log('Fetching swap requests for user:', userId);
  
  const { data, error } = await supabase.functions.invoke('get_swap_requests', {
    body: { user_id: userId, status }
  });
  
  if (error) throw error;
  
  console.log('Received swap requests data:', data);
  return data || [];
};

/**
 * Deletes a swap request
 * @param requestId The ID of the request to delete
 */
export const deleteSwapRequestApi = async (requestId: string) => {
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
  console.log('Deleting preferred day:', dayId, 'from request:', requestId);
  
  const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
    body: { day_id: dayId, request_id: requestId }
  });
  
  if (error) throw error;
  
  return data;
};
