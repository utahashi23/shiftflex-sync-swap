
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
      
      // Fetch all preferred dates for this user's shifts
      const { data: preferredDates, error: preferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select(`
          id, 
          date, 
          accepted_types, 
          request_id, 
          shifts!inner (
            id, 
            date, 
            start_time, 
            end_time, 
            truck_name,
            user_id
          )
        `)
        .eq('shifts.user_id', user.id);
      
      if (preferredDatesError) throw preferredDatesError;
      
      console.log('Fetched preferred dates:', preferredDates);
      
      if (!preferredDates || preferredDates.length === 0) {
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Group by shift id
      const groupedByShift = preferredDates.reduce((acc, item) => {
        const shiftId = item.shifts.id;
        
        // Determine shift type based on start time
        let shiftType: "day" | "afternoon" | "night" = 'day';
        const startHour = new Date(`2000-01-01T${item.shifts.start_time}`).getHours();
        
        if (startHour <= 8) {
          shiftType = 'day';
        } else if (startHour > 8 && startHour < 16) {
          shiftType = 'afternoon';
        } else {
          shiftType = 'night';
        }
        
        if (!acc[shiftId]) {
          acc[shiftId] = {
            id: shiftId,
            requesterId: item.shifts.user_id,
            status: 'pending',
            originalShift: {
              id: item.shifts.id,
              date: item.shifts.date,
              title: item.shifts.truck_name || `Shift-${item.shifts.id.substring(0, 5)}`,
              startTime: item.shifts.start_time.substring(0, 5), // Format as HH:MM
              endTime: item.shifts.end_time.substring(0, 5),     // Format as HH:MM
              type: shiftType
            },
            preferredDates: []
          };
        }
        
        acc[shiftId].preferredDates.push({
          id: item.id,
          date: item.date,
          acceptedTypes: item.accepted_types as ("day" | "afternoon" | "night")[]
        });
        
        return acc;
      }, {} as Record<string, SwapRequest>);
      
      // Convert to array
      const formattedRequests = Object.values(groupedByShift);
      
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
