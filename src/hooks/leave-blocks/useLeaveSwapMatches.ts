
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
      
      // Fetch matches using a simpler query approach
      const { data, error } = await supabase
        .from('leave_swap_matches')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          acceptor_id,
          requester_leave_block_id,
          acceptor_leave_block_id
        `)
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
      
      if (error) {
        console.error("Error fetching leave swap matches:", error);
        throw error;
      }
      
      // Add debug output to see what's coming from the database
      console.log(`Fetched ${data?.length || 0} raw matches from database`);
      data?.forEach((match, index) => {
        console.log(`Match ${index+1} (ID: ${match.id}): requester=${match.requester_id}, acceptor=${match.acceptor_id}`);
      });
      
      // Now we'll fetch the related data separately for better type safety
      // Get all the leave block IDs we need
      const leaveBlockIds = data?.flatMap(match => [
        match.requester_leave_block_id, 
        match.acceptor_leave_block_id
      ]) || [];
      
      // Get all the user IDs we need
      const otherUserIds = data?.map(match => 
        match.requester_id === userId ? match.acceptor_id : match.requester_id
      ) || [];
      
      // Fetch leave blocks
      const { data: leaveBlocks, error: leaveBlocksError } = await supabase
        .from('leave_blocks')
        .select('id, block_number, start_date, end_date')
        .in('id', leaveBlockIds);
      
      if (leaveBlocksError) throw leaveBlocksError;
      
      // Fetch other users' profiles
      const { data: otherUserProfiles, error: otherUserProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id')
        .in('id', otherUserIds);
      
      if (otherUserProfilesError) throw otherUserProfilesError;
      
      // Create a map for quick lookup
      const leaveBlocksMap = new Map(
        leaveBlocks?.map(block => [block.id, block]) || []
      );
      
      const userProfilesMap = new Map(
        otherUserProfiles?.map(profile => [profile.id, profile]) || []
      );
      
      // Transform the data and ensure uniqueness by match_id
      // This is where we need to improve the deduplication logic
      const matchesMap = new Map();
      
      data?.forEach(match => {
        const matchId = match.id;
        
        // Skip if we've already processed this match ID
        if (matchesMap.has(matchId)) {
          console.log(`Skipping duplicate match ID: ${matchId}`);
          return;
        }
        
        const isRequester = match.requester_id === userId;
        
        const myLeaveBlockId = isRequester 
          ? match.requester_leave_block_id 
          : match.acceptor_leave_block_id;
          
        const otherLeaveBlockId = isRequester 
          ? match.acceptor_leave_block_id 
          : match.requester_leave_block_id;
          
        const myLeaveBlock = leaveBlocksMap.get(myLeaveBlockId);
        const otherLeaveBlock = leaveBlocksMap.get(otherLeaveBlockId);
        
        const otherUserId = isRequester ? match.acceptor_id : match.requester_id;
        const otherUserProfile = userProfilesMap.get(otherUserId);
        
        const otherUserName = otherUserProfile 
          ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim() 
          : 'Unknown User';
          
        const formattedMatch = {
          match_id: matchId,
          match_status: match.status,
          created_at: match.created_at,
          my_leave_block_id: myLeaveBlockId,
          my_block_number: myLeaveBlock?.block_number || 0,
          my_start_date: myLeaveBlock?.start_date || '',
          my_end_date: myLeaveBlock?.end_date || '',
          other_leave_block_id: otherLeaveBlockId,
          other_block_number: otherLeaveBlock?.block_number || 0,
          other_start_date: otherLeaveBlock?.start_date || '',
          other_end_date: otherLeaveBlock?.end_date || '',
          other_user_id: otherUserId,
          other_user_name: otherUserName,
          other_employee_id: otherUserProfile?.employee_id || 'N/A',
          is_requester: isRequester,
          my_user_name: myUserName,
          my_employee_id: myEmployeeId || 'N/A'
        };
        
        console.log(`Adding match to results: ID=${matchId}, Block=${formattedMatch.my_block_number}->${formattedMatch.other_block_number}`);
        
        // Add the match to our map using the match ID as the key
        matchesMap.set(matchId, formattedMatch);
      });
      
      const result = Array.from(matchesMap.values()) as LeaveSwapMatch[];
      console.log(`Returning ${result.length} unique matches after deduplication`);
      
      return result;
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
