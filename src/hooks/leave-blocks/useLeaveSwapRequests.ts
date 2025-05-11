
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapRequest } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

export const useLeaveSwapRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user's leave swap requests
  const {
    data: leaveSwapRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['leave-swap-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_leave_swap_requests');
      
      if (error) throw error;
      return data as LeaveSwapRequest[];
    }
  });
  
  // Create a new leave swap request
  const createRequestMutation = useMutation({
    mutationFn: async ({ requesterLeaveBlockId, requestedLeaveBlockId }: { 
      requesterLeaveBlockId: string, 
      requestedLeaveBlockId: string 
    }) => {
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .insert({
          requester_id: (await supabase.auth.getUser()).data.user?.id,
          requester_leave_block_id: requesterLeaveBlockId,
          requested_leave_block_id: requestedLeaveBlockId,
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Swap request created',
        description: 'Your leave block swap request has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating swap request',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete a leave swap request
  const deleteRequestMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Swap request deleted',
        description: 'Your leave block swap request has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting swap request',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Filter requests by status
  const getRequestsByStatus = (status: string) => {
    return leaveSwapRequests?.filter(request => request.status === status) || [];
  };

  return {
    leaveSwapRequests,
    pendingRequests: leaveSwapRequests?.filter(req => req.status === 'pending') || [],
    matchedRequests: leaveSwapRequests?.filter(req => req.status === 'matched') || [],
    completedRequests: leaveSwapRequests?.filter(req => req.status === 'completed') || [],
    isLoadingRequests,
    requestsError,
    createRequest: createRequestMutation.mutate,
    isCreatingRequest: createRequestMutation.isPending,
    deleteRequest: deleteRequestMutation.mutate,
    isDeletingRequest: deleteRequestMutation.isPending,
    refetchRequests,
    getRequestsByStatus
  };
};
