
import { useState } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useFetchSwapRequests } from '@/hooks/swap-requests/useFetchSwapRequests';
import { deleteSwapRequestApi, deletePreferredDayApi } from '@/hooks/swap-requests/api';

const RequestedSwaps = () => {
  const { user } = useAuth();
  const { swapRequests, setSwapRequests, isLoading, fetchSwapRequests } = useFetchSwapRequests(user);
  
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null, 
    dayId: string | null 
  }>({
    isOpen: false,
    requestId: null,
    dayId: null
  });
  
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setDeleteLoading(true);
      
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
      setDeleteLoading(false);
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
        isLoading={deleteLoading}
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
