
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
      
      // Now get the matches with extended profile information
      const { data, error } = await supabase.rpc('get_user_leave_swap_matches_with_employee_id', {
        p_user_id: userId
      });
      
      if (error) {
        console.error("Error fetching leave swap matches:", error);
        throw error;
      }
      
      // Add the user's own info to each match
      const matchesWithMyInfo = (data || []).map(match => ({
        ...match,
        my_user_name: myUserName,
        my_employee_id: myEmployeeId,
      }));
      
      return matchesWithMyInfo as LeaveSwapMatch[];
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
