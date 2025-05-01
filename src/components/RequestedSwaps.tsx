
import { useState } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useSwapRequests } from '@/hooks/useSwapRequests';

const RequestedSwaps = () => {
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    shiftId: string | null, 
    dateId: string | null 
  }>({
    isOpen: false,
    shiftId: null,
    dateId: null
  });
  
  const {
    swapRequests,
    isLoading,
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  } = useSwapRequests();

  // Handler for opening delete dialog for an entire swap request
  const onDeleteRequest = (shiftId: string) => {
    console.log("Opening delete dialog for shift:", shiftId);
    setDeleteDialog({
      isOpen: true,
      shiftId,
      dateId: null
    });
  };

  // Handler for opening delete dialog for a single preferred date
  const onDeletePreferredDate = (dateId: string, shiftId: string) => {
    console.log("Opening delete dialog for date:", dateId, "in shift:", shiftId);
    setDeleteDialog({
      isOpen: true,
      shiftId,
      dateId
    });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    console.log("Confirming deletion:", deleteDialog);
    if (!deleteDialog.shiftId) {
      console.log("No shift ID found in delete dialog");
      return;
    }
    
    if (deleteDialog.dateId) {
      // Delete a single preferred date
      await handleDeletePreferredDate(deleteDialog.dateId, deleteDialog.shiftId);
    } else {
      // Delete the entire swap request
      await handleDeleteSwapRequest(deleteDialog.shiftId);
    }
    
    // Reset dialog state after action
    setDeleteDialog({ isOpen: false, shiftId: null, dateId: null });
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
            key={request.originalShift.id}
            request={request}
            onDeleteRequest={onDeleteRequest}
            onDeletePreferredDate={onDeletePreferredDate}
          />
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <SwapDeleteDialog
        isOpen={deleteDialog.isOpen}
        isLoading={isLoading}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, shiftId: null, dateId: null });
          } else {
            setDeleteDialog(prev => ({ ...prev, isOpen: true }));
          }
        }}
        onDelete={handleConfirmDelete}
        isDateOnly={!!deleteDialog.dateId}
      />
    </div>
  );
};

export default RequestedSwaps;
