
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSwapRequests, cancelSwapRequest } from '@/services/swapService';
import SwapRequestCard from './swaps/SwapRequestCard';
import NoSwapsState from './swaps/NoSwapsState';
import SwapsLoadingState from './swaps/SwapsLoadingState';

const RequestedSwaps = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch swap requests
  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['swap-requests'],
    queryFn: async () => fetchSwapRequests(user?.id),
    enabled: !!user,
  });
  
  // Cancel swap request mutation
  const cancelSwapMutation = useMutation({
    mutationFn: cancelSwapRequest,
    onSuccess: (swapId) => {
      toast({
        title: "Swap Request Cancelled",
        description: "Your swap request has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: "There was a problem cancelling your request.",
        variant: "destructive",
      });
    }
  });

  const handleCancelSwap = (swapId: string) => {
    cancelSwapMutation.mutate(swapId);
  };

  if (isLoading) {
    return <SwapsLoadingState />;
  }

  if (!swapRequests || swapRequests.length === 0) {
    return <NoSwapsState />;
  }

  return (
    <div className="space-y-6">
      {swapRequests.map((swap) => (
        <SwapRequestCard 
          key={swap.id}
          swap={swap}
          onCancel={handleCancelSwap}
          isCancelling={cancelSwapMutation.isPending}
        />
      ))}
    </div>
  );
};

export default RequestedSwaps;
