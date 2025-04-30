
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ShiftDetails, PreferredDate, SwapRequest } from '@/components/swaps/SwapRequestCard';

export const useSwapRequests = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch swap requests from the database
  const fetchSwapRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Fetch swap requests where the user is the requester
      const { data: swapRequestsData, error: swapError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_shift_id,
          created_at
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
        
      if (swapError) throw swapError;
      
      if (!swapRequestsData || swapRequestsData.length === 0) {
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Get all the shift IDs to fetch their details
      const shiftIds = swapRequestsData.map(req => req.requester_shift_id);
      
      // Fetch details for all the original shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      // Map the data to our UI format
      const formattedRequests: SwapRequest[] = swapRequestsData.map(request => {
        // Find the corresponding shift
        const shift = shiftsData?.find(s => s.id === request.requester_shift_id);
        
        if (!shift) {
          console.error(`Shift not found for request ${request.id}`);
          return null;
        }
        
        // Determine shift type based on start time
        let type = 'day';
        const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
        
        if (startHour <= 8) {
          type = 'day';
        } else if (startHour > 8 && startHour < 16) {
          type = 'afternoon';
        } else {
          type = 'night';
        }
        
        // For now, we'll use the same date as the preferred date
        // In a real app with a separate table for preferred dates, we would fetch those
        const preferredDates = [
          { 
            date: new Date(shift.date).toISOString().split('T')[0], 
            acceptedTypes: [type] 
          }
        ];
        
        return {
          id: request.id,
          originalShift: {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5),
            endTime: shift.end_time.substring(0, 5),
            type
          },
          preferredDates,
          status: request.status
        };
      }).filter(Boolean) as SwapRequest[];
      
      setSwapRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: "Failed to load swap requests",
        description: "There was a problem loading your swap requests. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request with ID:', requestId);
      
      // First delete without trying to get the count - fixed the error
      const { error } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId);
        
      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }
      
      console.log('Swap request deleted successfully');
      
      // Update local state after successful deletion
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Swap Request Deleted",
        description: "Your swap request has been deleted."
      });
      
      // Refresh the data from the database to ensure UI is in sync
      fetchSwapRequests();
      
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Error",
        description: "Failed to delete the swap request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single preferred date from a swap request
  const handleDeletePreferredDate = async (requestId: string, dateStr: string) => {
    // This functionality would require a separate table for preferred dates
    // For now, we'll just handle the UI aspect
    if (!requestId || !dateStr) return;
    
    setIsLoading(true);
    
    // In a real app, this would make an API call to update the preferred dates
    setTimeout(() => {
      setSwapRequests(prev => {
        const updated = prev.map(req => {
          if (req.id === requestId) {
            const updatedPreferredDates = req.preferredDates.filter(
              date => date.date !== dateStr
            );
            
            // If no preferred dates left, remove the whole request
            if (updatedPreferredDates.length === 0) {
              return null;
            }
            
            return {
              ...req,
              preferredDates: updatedPreferredDates
            };
          }
          return req;
        }).filter(Boolean) as SwapRequest[];
        
        return updated;
      });
      
      toast({
        title: "Preferred Date Removed",
        description: "The selected date has been removed from your swap request.",
      });
      
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchSwapRequests();
  }, [user]);

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  };
};
