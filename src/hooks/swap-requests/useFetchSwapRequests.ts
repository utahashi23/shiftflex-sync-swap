
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { SwapRequest } from './types';

export const useFetchSwapRequests = (user: User | null) => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSwapRequests = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // First, fetch the swap requests
      const { data: swapRequestsData, error: swapRequestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (swapRequestsError) throw swapRequestsError;
      
      console.log('Fetched swap requests:', swapRequestsData);
      
      if (!swapRequestsData || swapRequestsData.length === 0) {
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Then, fetch the shift details for each swap request
      const formattedRequests: SwapRequest[] = [];
      
      for (const request of swapRequestsData) {
        // Get the shift details for this request
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', request.requester_shift_id)
          .single();
        
        if (shiftError) {
          console.error('Error fetching shift:', shiftError);
          continue;
        }
        
        if (!shiftData) continue;
        
        // Determine shift type based on start time
        let shiftType: "day" | "afternoon" | "night" = 'day';
        const startHour = new Date(`2000-01-01T${shiftData.start_time}`).getHours();
        
        if (startHour <= 8) {
          shiftType = 'day';
        } else if (startHour > 8 && startHour < 16) {
          shiftType = 'afternoon';
        } else {
          shiftType = 'night';
        }
        
        // Fetch preferred dates for this request
        const { data: preferredDatesData, error: preferredDatesError } = await supabase
          .from('shift_swap_preferred_dates')
          .select('*')
          .eq('request_id', request.id);
          
        if (preferredDatesError) {
          console.error('Error fetching preferred dates:', preferredDatesError);
          continue;
        }
        
        // Format the preferred dates
        const preferredDates = preferredDatesData?.map(date => ({
          date: date.date,
          acceptedTypes: date.accepted_types as ("day" | "afternoon" | "night")[]
        })) || [];
        
        // Create the formatted request
        formattedRequests.push({
          id: request.id,
          status: request.status,
          originalShift: {
            id: shiftData.id,
            date: shiftData.date,
            title: shiftData.truck_name || `Shift-${shiftData.id.substring(0, 5)}`,
            startTime: shiftData.start_time.substring(0, 5), // Format as HH:MM
            endTime: shiftData.end_time.substring(0, 5),    // Format as HH:MM
            type: shiftType
          },
          preferredDates: preferredDates
        });
      }
      
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
