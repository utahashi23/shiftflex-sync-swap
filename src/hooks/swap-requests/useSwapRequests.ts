
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
      
      // Using edge function to bypass RLS issues
      const { data, error } = await supabase.functions.invoke('get_swap_requests', {
        body: { 
          user_id: user.id,
          status: 'pending'
        }
      });
      
      if (error) throw error;
      
      console.log('Received response from edge function:', data);
      
      if (!data || data.length === 0) {
        console.log('No swap requests found');
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Process the data returned from the edge function
      const formattedRequests = data.map(item => {
        // Extract shift data
        const shift = item.shift;
        
        // Format preferred days
        const preferredDates = (item.preferred_days || []).map(day => ({
          id: day.id,
          date: day.date,
          acceptedTypes: day.accepted_types
        }));
        
        return {
          id: item.id,
          requesterId: item.requester_id,
          status: item.status,
          originalShift: {
            id: shift.id,
            date: shift.date,
            title: shift.truckName || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.startTime.substring(0, 5),
            endTime: shift.endTime.substring(0, 5),
            type: shift.type
          },
          preferredDates
        };
      }).filter(Boolean) as SwapRequest[];
      
      console.log('Formatted requests:', formattedRequests);
      setSwapRequests(formattedRequests);
      
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

  // Load swap requests on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);

  // Function to delete a swap request
  const deleteSwapRequest = async (requestId: string) => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting swap request:', requestId);
      
      // Use the edge function to delete the request
      const { data, error } = await supabase.functions.invoke('delete_swap_request', {
        body: { request_id: requestId }
      });
        
      if (error) throw error;
      
      // Update local state
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request deleted",
        description: "Swap request has been deleted."
      });
      
      return true;
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
    if (!user) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting preferred day:', dayId);
      
      // Use the edge function to delete the preferred day
      const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
        body: { 
          day_id: dayId,
          request_id: requestId
        }
      });
        
      if (error) throw error;
      
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
      
      return true;
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

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    deleteSwapRequest,
    deletePreferredDay
  };
};
