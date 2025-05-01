
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';

export const useSwapRequests = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchSwapRequests = async () => {
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // Using a direct call with query parameters instead of RPC
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          id, 
          status, 
          requester_id,
          requester_shift_id,
          created_at,
          shifts:requester_shift_id (
            id, date, start_time, end_time, truck_name
          ),
          shift_swap_preferred_dates (
            id, date, accepted_types
          )
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (error) {
        console.error('Error fetching swap requests:', error);
        throw error;
      }
      
      console.log('Received swap request data:', data);
      const formattedData = formatSwapRequests(data || []);
      setSwapRequests(formattedData);
      
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format response data into SwapRequest objects
  const formatSwapRequests = (data: any[]): SwapRequest[] => {
    return data.map(item => {
      // Extract shift data - handle both nested and flat structure
      const shift = item.shifts || {};
      
      // Format preferred days - handle both nested and flat structure
      const preferredDatesRaw = item.shift_swap_preferred_dates || [];
      const preferredDates = preferredDatesRaw.map((day: any) => ({
        id: day.id,
        date: day.date,
        acceptedTypes: day.accepted_types
      }));
      
      // Determine shift type based on start time if not already provided
      let shiftType: 'day' | 'afternoon' | 'night' = 'day';
      const startTime = shift.start_time;
      if (startTime) {
        const startHour = parseInt(startTime.split(':')[0], 10);
        if (startHour <= 8) {
          shiftType = 'day';
        } else if (startHour > 8 && startHour < 16) {
          shiftType = 'afternoon';
        } else {
          shiftType = 'night';
        }
      }
      
      return {
        id: item.id,
        requesterId: item.requester_id,
        status: item.status,
        originalShift: {
          id: shift.id,
          date: shift.date,
          title: shift.truck_name || `Shift-${shift.id?.substring(0, 5)}`,
          startTime: (startTime || '').substring(0, 5),
          endTime: (shift.end_time || '').substring(0, 5),
          type: shiftType
        },
        preferredDates
      };
    }).filter(Boolean) as SwapRequest[];
  };

  // Load swap requests on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);

  // Function to delete a swap request
  const deleteSwapRequest = async (requestId: string) => {
    if (!user || !requestId) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting swap request:', requestId);
      
      // Try using the delete_swap_request edge function first
      try {
        const { data, error } = await supabase.functions.invoke('delete_swap_request', {
          body: { 
            request_id: requestId,
            user_id: user.id 
          }
        });
          
        if (error) throw error;
        
        // Update local state
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        
        toast({
          title: "Request deleted",
          description: "Swap request has been deleted."
        });
        
        return true;
      } catch (funcError) {
        console.error('Edge function error:', funcError);
        
        // Fall back to direct deletion if edge function fails
        const { error: deleteError } = await supabase
          .from('shift_swap_requests')
          .delete()
          .eq('id', requestId)
          .eq('requester_id', user.id);
          
        if (deleteError) throw deleteError;
        
        // Update local state
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        
        toast({
          title: "Request deleted",
          description: "Swap request has been deleted."
        });
        
        return true;
      }
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Deletion failed",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to delete a preferred day
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!user || !dayId || !requestId) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting preferred day:', dayId);
      
      // Try using the delete_preferred_day edge function first
      try {
        const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
          body: { 
            day_id: dayId,
            request_id: requestId,
            user_id: user.id
          }
        });
          
        if (error) throw error;
        
        handlePreferredDayDeletionResponse(data, requestId, dayId);
        return true;
      } catch (funcError) {
        console.error('Edge function error:', funcError);
        
        // Fall back to direct deletion if edge function fails
        const { error: deleteError } = await supabase
          .from('shift_swap_preferred_dates')
          .delete()
          .eq('id', dayId)
          .eq('request_id', requestId);
          
        if (deleteError) throw deleteError;
        
        // Check if any preferred days remain for this request
        const { data: remainingDays, error: countError } = await supabase
          .from('shift_swap_preferred_dates')
          .select('id')
          .eq('request_id', requestId);
          
        if (countError) throw countError;
        
        // If no days left, delete the whole request
        if (!remainingDays || remainingDays.length === 0) {
          const { error: deleteRequestError } = await supabase
            .from('shift_swap_requests')
            .delete()
            .eq('id', requestId);
          
          if (deleteRequestError) throw deleteRequestError;
          
          // Remove the request entirely
          setSwapRequests(prev => prev.filter(req => req.id !== requestId));
          
          toast({
            title: "Request updated",
            description: "The swap request has been removed as it had no remaining preferred dates."
          });
        } else {
          // Just update the preferred dates for this request
          setSwapRequests(prevRequests => 
            prevRequests.map(req => {
              if (req.id === requestId) {
                return {
                  ...req,
                  preferredDates: req.preferredDates.filter(day => day.id !== dayId)
                };
              }
              return req;
            })
          );
          
          toast({
            title: "Date removed",
            description: "Preferred date has been removed from your request."
          });
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error deleting preferred day:', error);
      toast({
        title: "Deletion failed",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to handle deletion response
  const handlePreferredDayDeletionResponse = (data: any, requestId: string, dayId: string) => {
    // Check if the entire request was deleted
    if (data && data.request_deleted) {
      // Remove the request entirely
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request updated",
        description: "The swap request has been removed as it had no remaining preferred dates."
      });
    } else {
      // Just update the preferred dates for this request
      setSwapRequests(prevRequests => 
        prevRequests.map(req => {
          if (req.id === requestId) {
            return {
              ...req,
              preferredDates: req.preferredDates.filter(day => day.id !== dayId)
            };
          }
          return req;
        })
      );
      
      toast({
        title: "Date removed",
        description: "Preferred date has been removed from your request."
      });
    }
  };

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    deleteSwapRequest,
    deletePreferredDay
  };
};
