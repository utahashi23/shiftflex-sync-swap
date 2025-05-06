
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useSwapRequests } from '@/hooks/swap-requests';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RequestedSwaps = () => {
  const [activeTab, setActiveTab] = useState('pending');
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

  // Fetch swap requests when component mounts or tab changes
  useEffect(() => {
    const status = activeTab === 'pending' ? 'pending' : 'completed';
    fetchSwapRequests(status);
  }, [fetchSwapRequests, activeTab]);
  
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
        
        // Type-safe check if this was the last date and the entire request was deleted
        if (result && 'requestDeleted' in result && result.requestDeleted) {
          // Refresh the list
          fetchSwapRequests(activeTab === 'pending' ? 'pending' : 'completed');
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
  
  // Handler to refresh the current tab's data
  const handleRefresh = () => {
    const status = activeTab === 'pending' ? 'pending' : 'completed';
    fetchSwapRequests(status);
  };
  
  console.log("Current swap requests:", swapRequests);
  console.log("Current tab:", activeTab);
  
  return (
    <div>
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="pending" disabled={isLoading}>Pending</TabsTrigger>
            <TabsTrigger value="completed" disabled={isLoading}>Completed</TabsTrigger>
          </TabsList>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </>
            )}
          </Button>
        </div>
        
        <TabsContent value="pending" className="space-y-6 mt-0">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <SwapRequestSkeleton key={index} />
              ))}
            </div>
          ) : swapRequests.length === 0 ? (
            <EmptySwapRequests message="No pending swap requests" subtitle="You don't have any pending swap requests at the moment." />
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
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-6 mt-0">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <SwapRequestSkeleton key={index} />
              ))}
            </div>
          ) : swapRequests.length === 0 ? (
            <EmptySwapState message="No completed swap requests" subtitle="You don't have any completed swap requests yet." />
          ) : (
            swapRequests.map(request => (
              <SwapRequestCard 
                key={request.id}
                request={request}
                onDeleteRequest={onDeleteRequest}
                onDeletePreferredDate={onDeletePreferredDate}
                isCompleted={true}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

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
