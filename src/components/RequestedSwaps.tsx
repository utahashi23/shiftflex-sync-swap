
import { useState, useEffect } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from '@/hooks/swap-requests/types';

const RequestedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null, 
    dayId: string | null 
  }>({
    isOpen: false,
    requestId: null,
    dayId: null
  });
  
  const { user } = useAuth();

  // Fetch swap requests directly here instead of using hook to simplify
  const fetchSwapRequests = async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Direct database query instead of edge function to avoid RLS issues
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id, status, requester_shift_id, created_at, requester_id')
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error fetching swap requests:', requestsError);
        toast({
          title: "Error",
          description: "Failed to load swap requests. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
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
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        toast({
          title: "Error",
          description: "Failed to load shift data. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Fetch the preferred dates for all requests
      const requestIds = requests.map(req => req.id);
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (datesError) {
        console.error('Error fetching preferred dates:', datesError);
        toast({
          title: "Error",
          description: "Failed to load preferred dates. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Create lookup maps for easy access
      const shiftMap = shifts.reduce((acc, shift) => {
        acc[shift.id] = shift;
        return acc;
      }, {} as Record<string, any>);
      
      const preferredDatesByRequest = preferredDates.reduce((acc, date) => {
        if (!acc[date.request_id]) {
          acc[date.request_id] = [];
        }
        acc[date.request_id].push(date);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Format the requests
      const formattedRequests = requests
        .filter(request => shiftMap[request.requester_shift_id])
        .map(request => {
          const shift = shiftMap[request.requester_shift_id];
          
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
              startTime: shift.start_time.substring(0, 5), // Format as HH:MM
              endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
              type: shiftType
            },
            preferredDates: requestPreferredDates
          };
        });
      
      setSwapRequests(formattedRequests);
    } catch (error) {
      console.error('Error in fetchSwapRequests:', error);
      toast({
        title: "Error",
        description: "Something went wrong while loading swap requests.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load swap requests on component mount
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);

  // Handler for opening delete dialog for an entire swap request
  const onDeleteRequest = (requestId: string) => {
    console.log("Opening delete dialog for request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId: null
    });
  };

  // Handler for opening delete dialog for a single preferred date
  const onDeletePreferredDate = (dayId: string, requestId: string) => {
    console.log("Opening delete dialog for day:", dayId, "in request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId
    });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    if (!deleteDialog.requestId) return;
    
    try {
      setIsLoading(true);
      
      if (deleteDialog.dayId) {
        // Delete a single preferred date
        const { error } = await supabase.functions.invoke('delete_preferred_day', {
          body: { day_id: deleteDialog.dayId, request_id: deleteDialog.requestId }
        });
        
        if (error) throw error;
        
        // Update the UI by filtering out the deleted day
        setSwapRequests(prevRequests => 
          prevRequests.map(req => {
            if (req.id === deleteDialog.requestId) {
              return {
                ...req,
                preferredDates: req.preferredDates.filter(day => day.id !== deleteDialog.dayId)
              };
            }
            return req;
          })
        );
        
        toast({
          title: "Date removed",
          description: "Preferred date has been removed from your request."
        });
      } else {
        // Delete the entire swap request
        const { error } = await supabase.functions.invoke('delete_swap_request', {
          body: { request_id: deleteDialog.requestId }
        });
        
        if (error) throw error;
        
        // Update the UI by filtering out the deleted request
        setSwapRequests(prevRequests => 
          prevRequests.filter(req => req.id !== deleteDialog.requestId)
        );
        
        toast({
          title: "Request deleted",
          description: "Swap request has been deleted."
        });
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Deletion failed",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setDeleteDialog({ isOpen: false, requestId: null, dayId: null });
    }
  };
  
  console.log("Current swap requests:", swapRequests);
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <SwapRequestSkeleton key={index} />
          ))}
        </div>
      ) : swapRequests.length === 0 ? (
        <EmptySwapRequests />
      ) : (
        swapRequests.map(request => (
          <SwapRequestCard 
            key={request.id}
            request={request}
            onDeleteRequest={onDeleteRequest}
            onDeletePreferredDate={onDeletePreferredDate}
          />
        ))
      )}

      <SwapDeleteDialog
        isOpen={deleteDialog.isOpen}
        isLoading={isLoading}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, dayId: null });
          } else {
            setDeleteDialog(prev => ({ ...prev, isOpen: true }));
          }
        }}
        onDelete={handleConfirmDelete}
        isDateOnly={!!deleteDialog.dayId}
      />
    </div>
  );
};

export default RequestedSwaps;
