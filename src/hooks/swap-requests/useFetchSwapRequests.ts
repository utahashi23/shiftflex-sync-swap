
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { SwapRequest } from './types';
import { fetchSwapRequestsApi } from './api';

export const useFetchSwapRequests = (user: User | null) => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSwapRequests = useCallback(async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch raw requests data from API
      const requests = await fetchSwapRequestsApi(user.id);
      
      if (!requests || requests.length === 0) {
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Found requests:', requests);
      
      // Get all the shift IDs from the requests
      const shiftIds = requests.map(req => req.requester_shift_id);
      
      // Fetch the shift details
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!shifts) {
        throw new Error('Failed to fetch shift details');
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
      
      console.log('Fetched preferred dates:', preferredDates);
      
      // Map the requests to the format needed by the UI
      const formattedRequests = requests.map(request => {
        const shift = shiftMap[request.requester_shift_id];
        
        if (!shift) {
          console.warn(`Shift ${request.requester_shift_id} not found for request ${request.id}`);
          return null;
        }
        
        // Determine shift type based on start time
        let shiftType: "day" | "afternoon" | "night" = 'day';
        const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
        
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
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type: shiftType
          },
          preferredDates: requestPreferredDates
        };
      }).filter(Boolean) as SwapRequest[];
      
      console.log('Formatted requests:', formattedRequests);
      setSwapRequests(formattedRequests);
      
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { 
    swapRequests, 
    setSwapRequests, 
    isLoading, 
    setIsLoading, 
    fetchSwapRequests 
  };
};
