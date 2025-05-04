
import { useState, useEffect } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useSwapRequests } from '@/hooks/swap-requests';
import { toast } from '@/hooks/use-toast';

const RequestedSwaps = () => {
  const { 
    swapRequests, 
    isLoading,
    fetchSwapRequests, 
    deleteSwapRequest, 
    deletePreferredDay 
  } = useSwapRequests();
  
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null, 
    dayId: string | null,
    isDeleting: boolean
  }>({
    isOpen: false,
    requestId: null,
    dayId: null,
    isDeleting: false
  });
  
  // Fetch swap requests when component mounts
  useEffect(() => {
    fetchSwapRequests();
  }, [fetchSwapRequests]);
  
  // Handler for opening delete dialog for an entire swap request
  const onDeleteRequest = (requestId: string) => {
    console.log("Opening delete dialog for request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId: null,
      isDeleting: false
    });
  };

  // Handler for opening delete dialog for a single preferred date
  const onDeletePreferredDate = (dayId: string, requestId: string) => {
    console.log("Opening delete dialog for day:", dayId, "in request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId,
      isDeleting: false
    });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    if (!deleteDialog.requestId) return;
    
    try {
      setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
      
      if (deleteDialog.dayId) {
        // Delete a single preferred date
        const result = await deletePreferredDay(deleteDialog.dayId, deleteDialog.requestId);
        console.log("Delete preferred day result:", result);
        
        // If this was the last date and the entire request was deleted
        if (result && result.requestDeleted) {
          // Refresh the list
          fetchSwapRequests();
        }
      } else {
        // Delete the entire swap request
        await deleteSwapRequest(deleteDialog.requestId);
        // Request list will be updated in the useDeleteSwapRequest hook
      }
      
      setDeleteDialog({ isOpen: false, requestId: null, dayId: null, isDeleting: false });
    } catch (error) {
      console.error("Error in deletion process:", error);
      toast({
        title: "Deletion Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive"
      });
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
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
        isLoading={deleteDialog.isDeleting}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, dayId: null, isDeleting: false });
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
