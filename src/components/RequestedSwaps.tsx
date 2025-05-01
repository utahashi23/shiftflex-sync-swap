
import { useState, useEffect } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { fetchSwapRequestsApi, deleteSwapRequestApi, deletePreferredDayApi } from '@/hooks/swap-requests/api';
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

  // Fetch swap requests directly without using the hook to simplify
  const fetchSwapRequests = async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const formattedRequests = await fetchSwapRequestsApi(user.id);
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
        await deletePreferredDayApi(deleteDialog.dayId, deleteDialog.requestId);
        
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
        await deleteSwapRequestApi(deleteDialog.requestId);
        
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
