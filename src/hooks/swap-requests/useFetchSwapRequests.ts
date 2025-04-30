
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
      
      const { data: requests, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift:requester_shift_id (
            id,
            date,
            start_time,
            end_time,
            truck_name
          )
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      console.log('Fetched swap requests:', requests);
      
      // Transform the data to match our client-side model
      const formattedRequests: SwapRequest[] = requests.map(req => {
        // Determine shift type based on start time
        const shift = req.requester_shift;
        let shiftType: string = 'day';
        if (shift) {
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            shiftType = 'day';
          } else if (startHour > 8 && startHour < 16) {
            shiftType = 'afternoon';
          } else {
            shiftType = 'night';
          }
        }
        
        return {
          id: req.id,
          status: req.status,
          originalShift: shift ? {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),    // Format as HH:MM
            type: shiftType
          } : {
            id: 'unknown',
            date: 'unknown',
            title: 'Unknown Shift',
            startTime: '00:00',
            endTime: '00:00',
            type: 'day'
          },
          preferredDates: [
            // Add preferred dates
            // In a real app, you would fetch these from a separate table
            // For now, we're mocking it with the shift date + 1 day
            {
              date: shift ? 
                new Date(new Date(shift.date).getTime() + 86400000).toISOString().split('T')[0] : 
                new Date().toISOString().split('T')[0],
              acceptedTypes: [shiftType]
            }
          ]
        };
      });
      
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
