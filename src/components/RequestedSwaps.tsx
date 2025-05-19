
import React, { useState } from 'react';
import SwapRequestCard from '@/components/swaps/SwapRequestCard';
import { Button } from '@/components/ui/button';
import EmptySwapRequests from '@/components/swaps/EmptySwapRequests';
import { useDeleteSwapRequest } from '@/hooks/swap-requests/useDeleteSwapRequest';
import { SwapRequest } from '@/hooks/swap-requests/types';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';

const RequestedSwaps = ({
  swapRequests,
  isLoading,
  onRefresh,
}: {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  onRefresh: () => void;
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);
  const { isDeleting, deleteSwapRequest } = useDeleteSwapRequest();

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    const result = await deleteSwapRequest(selectedRequest.id);
    
    if (result.success) {
      setDeleteConfirmOpen(false);
      onRefresh();
    }
  };

  // If there are no swap requests, show the empty state
  if (!swapRequests || swapRequests.length === 0) {
    return <EmptySwapRequests loading={isLoading} />;
  }

  const confirmDelete = (request: SwapRequest) => {
    setSelectedRequest(request);
    setDeleteConfirmOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {swapRequests.map((request) => (
          <SwapRequestCard
            key={request.id}
            request={request}
            onDelete={() => confirmDelete(request)}
          />
        ))}
      </div>

      <SwapDeleteDialog
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onDelete={handleDeleteRequest}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default RequestedSwaps;
