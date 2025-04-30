
import { useState } from 'react';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useSwapRequests } from '@/hooks/useSwapRequests';
import { SwapRequest } from '@/hooks/swap-requests/types';

const RequestedSwaps = () => {
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null, 
    dateOnly: string | null 
  }>({
    isOpen: false,
    requestId: null,
    dateOnly: null
  });
  
  const {
    swapRequests,
    isLoading,
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  } = useSwapRequests();

  // Handler for opening delete dialog for an entire swap request
  const onDeleteRequest = (requestId: string) => {
    setDeleteDialog({
      isOpen: true,
      requestId,
      dateOnly: null
    });
  };

  // Handler for opening delete dialog for a single preferred date
  const onDeletePreferredDate = (requestId: string, dateOnly: string) => {
    setDeleteDialog({
      isOpen: true,
      requestId,
      dateOnly
    });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = () => {
    if (!deleteDialog.requestId) return;
    
    if (deleteDialog.dateOnly) {
      // Delete a single preferred date
      handleDeletePreferredDate(deleteDialog.requestId, deleteDialog.dateOnly);
    } else {
      // Delete the entire swap request
      handleDeleteSwapRequest(deleteDialog.requestId);
    }
    
    // Reset dialog state after action
    setDeleteDialog({ isOpen: false, requestId: null, dateOnly: null });
  };
  
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

      {/* Delete Confirmation Dialog */}
      <SwapDeleteDialog
        isOpen={deleteDialog.isOpen}
        isLoading={isLoading}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, dateOnly: null });
          }
        }}
        onDelete={handleConfirmDelete}
        isDateOnly={!!deleteDialog.dateOnly}
      />
    </div>
  );
};

export default RequestedSwaps;
