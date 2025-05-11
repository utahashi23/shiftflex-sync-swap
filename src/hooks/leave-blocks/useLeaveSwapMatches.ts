
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

export const useLeaveSwapMatches = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user's leave swap matches
  const {
    data: leaveSwapMatches,
    isLoading: isLoadingMatches,
    error: matchesError,
    refetch: refetchMatches
  } = useQuery({
    queryKey: ['leave-swap-matches'],
    queryFn: async () => {
      const currentUser = await supabase.auth.getUser();
      const userId = currentUser.data.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      
      // Get the user's profile info first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, employee_id')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      const myUserName = `${profileData.first_name} ${profileData.last_name}`;
      const myEmployeeId = profileData.employee_id;
      
      // Get matches where the user is involved - needs simplification
      const { data, error } = await supabase
        .from('leave_swap_matches')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          acceptor_id,
          requester_leave_block_id,
          acceptor_leave_block_id,
          requesterBlock:leave_blocks!requester_leave_block_id(block_number, start_date, end_date),
          acceptorBlock:leave_blocks!acceptor_leave_block_id(block_number, start_date, end_date),
          requesterProfile:profiles!requester_id(first_name, last_name, employee_id),
          acceptorProfile:profiles!acceptor_id(first_name, last_name, employee_id)
        `)
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
      
      if (error) {
        console.error("Error fetching leave swap matches:", error);
        throw error;
      }
      
      // Transform the data into the expected format
      const transformedData = data.map(match => {
        const isRequester = match.requester_id === userId;
        
        // Determine which fields to use based on whether the user is the requester or acceptor
        const myBlockNumber = isRequester 
          ? match.requesterBlock?.block_number 
          : match.acceptorBlock?.block_number;
          
        const myStartDate = isRequester 
          ? match.requesterBlock?.start_date 
          : match.acceptorBlock?.start_date;
          
        const myEndDate = isRequester 
          ? match.requesterBlock?.end_date 
          : match.acceptorBlock?.end_date;
          
        const otherBlockNumber = isRequester 
          ? match.acceptorBlock?.block_number 
          : match.requesterBlock?.block_number;
          
        const otherStartDate = isRequester 
          ? match.acceptorBlock?.start_date 
          : match.requesterBlock?.start_date;
          
        const otherEndDate = isRequester 
          ? match.acceptorBlock?.end_date 
          : match.requesterBlock?.end_date;
          
        const otherUserId = isRequester 
          ? match.acceptor_id 
          : match.requester_id;
          
        const otherUserProfile = isRequester 
          ? match.acceptorProfile 
          : match.requesterProfile;
          
        const myLeaveBlockId = isRequester 
          ? match.requester_leave_block_id 
          : match.acceptor_leave_block_id;
          
        const otherLeaveBlockId = isRequester 
          ? match.acceptor_leave_block_id 
          : match.requester_leave_block_id;
          
        return {
          match_id: match.id,
          match_status: match.status,
          created_at: match.created_at,
          my_block_number: myBlockNumber || 0,
          my_start_date: myStartDate || '',
          my_end_date: myEndDate || '',
          other_block_number: otherBlockNumber || 0,
          other_start_date: otherStartDate || '',
          other_end_date: otherEndDate || '',
          other_user_id: otherUserId,
          other_user_name: `${otherUserProfile?.first_name || ''} ${otherUserProfile?.last_name || ''}`.trim() || 'Unknown User',
          other_employee_id: otherUserProfile?.employee_id || 'N/A',
          is_requester: isRequester,
          my_user_name: myUserName,
          my_employee_id: myEmployeeId || 'N/A',
          my_leave_block_id: myLeaveBlockId,
          other_leave_block_id: otherLeaveBlockId
        };
      });
      
      return transformedData as LeaveSwapMatch[];
    }
  });
  
  // Find potential leave block swap matches
  const findMatchesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
        body: { admin_secret: true }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.matches_created > 0) {
        toast({
          title: 'Matches found!',
          description: `Found ${data.matches_created} potential leave block swap matches.`,
        });
        queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
      } else {
        toast({
          title: 'No matches found',
          description: 'No potential leave block swap matches were found at this time.',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error finding matches',
        description: error.message || 'An error occurred while finding matches.',
        variant: 'destructive',
      });
    }
  });
  
  // Accept a leave swap match
  const acceptMatchMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase
        .from('leave_swap_matches')
        .update({ status: 'accepted' })
        .eq('id', matchId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Match accepted',
        description: 'The leave block swap match has been accepted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
    },
    onError: (error) => {
      toast({
        title: 'Error accepting match',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Finalize a leave swap match
  const finalizeMatchMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase
        .from('leave_swap_matches')
        .update({ status: 'completed' })
        .eq('id', matchId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Match finalized',
        description: 'The leave block swap has been finalized successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error finalizing match',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Cancel a leave swap match
  const cancelMatchMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase
        .from('leave_swap_matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Match cancelled',
        description: 'The leave block swap match has been cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
    },
    onError: (error) => {
      toast({
        title: 'Error cancelling match',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Separate active and past matches based on status
  const activeMatches = leaveSwapMatches?.filter(
    match => ['pending', 'accepted'].includes(match.match_status)
  ) || [];
  
  const pastMatches = leaveSwapMatches?.filter(
    match => ['completed', 'cancelled'].includes(match.match_status)
  ) || [];

  return {
    leaveSwapMatches,
    activeMatches,
    pastMatches,
    isLoadingMatches,
    matchesError,
    findMatches: findMatchesMutation.mutate,
    isFindingMatches: findMatchesMutation.isPending,
    acceptMatch: acceptMatchMutation.mutate,
    isAcceptingMatch: acceptMatchMutation.isPending,
    finalizeMatch: finalizeMatchMutation.mutate,
    isFinalizingMatch: finalizeMatchMutation.isPending,
    cancelMatch: cancelMatchMutation.mutate,
    isCancellingMatch: cancelMatchMutation.isPending,
    refetchMatches
  };
};
