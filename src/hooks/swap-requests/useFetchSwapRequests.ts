
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { SwapRequest } from './types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches swap requests directly from the database without using the edge function
 */
export const useFetchSwapRequests = (user: User | null) => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSwapRequests = useCallback(async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // Direct database query instead of edge function
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id, status, requester_shift_id, created_at, requester_id')
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;
      
      console.log(`Found ${requests?.length || 0} swap requests`);
      
      if (!requests || requests.length === 0) {
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Get all the shift IDs from the requests
      const shiftIds = requests
        .filter(req => req && req.requester_shift_id)
        .map(req => req.requester_shift_id);
      
      // Fetch the shift details
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      // Create a lookup for easy access
      const shiftMap = shifts?.reduce((acc, shift) => {
        acc[shift.id] = shift;
        return acc;
      }, {} as Record<string, any>) || {};
      
      // Fetch the preferred dates for all requests
      const requestIds = requests.map(req => req.id);
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (datesError) throw datesError;
      
      // Group preferred dates by request ID
      const preferredDatesByRequest: Record<string, any[]> = {};
      preferredDates?.forEach(date => {
        if (!preferredDatesByRequest[date.request_id]) {
          preferredDatesByRequest[date.request_id] = [];
        }
        preferredDatesByRequest[date.request_id].push(date);
      });
      
      // Format and return the requests
      const formattedRequests = requests
        .map(request => {
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
          const requestPreferredDates = (preferredDatesByRequest[request.id] || [])
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
        })
        .filter(Boolean) as SwapRequest[];
      
      console.log('Formatted requests:', formattedRequests);
      setSwapRequests(formattedRequests);
      
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load swap requests on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user, fetchSwapRequests]);

  return { 
    swapRequests, 
    setSwapRequests, 
    isLoading, 
    error,
    fetchSwapRequests 
  };
};
