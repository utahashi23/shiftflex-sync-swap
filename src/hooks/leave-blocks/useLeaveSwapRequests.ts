
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapRequest } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

export const useLeaveSwapRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's leave swap requests
  const {
    data: swapRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['leave-swap-requests'],
    queryFn: async () => {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .select('*, requester_leave_block:leave_blocks!requester_leave_block_id(*), requested_leave_block:leave_blocks!requested_leave_block_id(*)')
        .eq('requester_id', userId);
      
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .insert({
          requester_id: userId,
          requester_leave_block_id: requesterLeaveBlockId,
          requested_leave_block_id: requestedLeaveBlockId,
          status: 'pending'
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Request created',
        description: 'Your leave block swap request has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating request',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Delete a leave swap request (now allowing matched requests to be deleted)
  const deleteRequestMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      // First check if this request is part of a match
      const { data: matchData, error: matchError } = await supabase
        .from('leave_swap_matches')
        .select('id, status')
        .or(`requester_leave_block_id.eq.${requestId},acceptor_leave_block_id.eq.${requestId}`);
      
      if (matchError) throw matchError;
      
      // If there's a match and it's not completed, handle it appropriately
      if (matchData && matchData.length > 0) {
        // Only cancel the match if it's not already completed
        const match = matchData[0];
        if (match.status !== 'completed') {
          const { error: cancelError } = await supabase
            .from('leave_swap_matches')
            .update({ status: 'cancelled' })
            .eq('id', match.id);
          
          if (cancelError) throw cancelError;
        }
      }
      
      // Now delete the request
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .delete()
        .eq('id', requestId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Request deleted',
        description: 'Your leave block swap request has been deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting request',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Separate pending and matched requests
  const pendingRequests = swapRequests?.filter(
    request => request.status === 'pending'
  ) || [];
  
  const matchedRequests = swapRequests?.filter(
    request => request.status === 'matched'
  ) || [];
  
  const completedRequests = swapRequests?.filter(
    request => ['completed', 'cancelled'].includes(request.status)
  ) || [];

  return {
    swapRequests,
    pendingRequests,
    matchedRequests,
    completedRequests,
    isLoadingRequests,
    requestsError,
    createRequest: createRequestMutation.mutate,
    isCreatingRequest: createRequestMutation.isPending,
    deleteRequest: deleteRequestMutation.mutate,
    isDeletingRequest: deleteRequestMutation.isPending,
    refetchRequests
  };
};
