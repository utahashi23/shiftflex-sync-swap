import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useLeaveSwapMatches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  
  // First fetch the user's swap requests to determine if they have any
  const {
    data: userSwapRequests,
    isLoading: isLoadingRequests
  } = useQuery({
    queryKey: ['leave-swap-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Only fetch leave swap matches if user has active requests
  const {
    data: leaveSwapMatches,
    isLoading: isLoadingMatches,
    error: matchesError,
    refetch: refetchMatches
  } = useQuery({
    queryKey: ['leave-swap-matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Skip fetching matches if user has no active swap requests
      if (userSwapRequests && userSwapRequests.length === 0) {
        console.log('User has no active swap requests, skipping match fetch');
        return [];
      }
      
      const { data, error } = await supabase
        .rpc('get_user_leave_swap_matches', { p_user_id: user.id });
      
      if (error) throw error;
      
      // Log original data for debugging
      console.log('Original matches from API:', data ? data.length : 0);
      
      // Deduplicate matches by match_id
      if (data && data.length > 0) {
        const seenIds = new Set();
        const uniqueMatches = data.filter((match: LeaveSwapMatch) => {
          // If we've already seen this ID, filter it out
          if (seenIds.has(match.match_id)) {
            console.log('Filtering duplicate match:', match.match_id);
            return false;
          }
          // Otherwise add it to our set and keep it
          seenIds.add(match.match_id);
          return true;
        });
        
        console.log('After deduplication:', uniqueMatches.length);
        return uniqueMatches as LeaveSwapMatch[];
      }
      
      return data as LeaveSwapMatch[];
    },
    enabled: !!user?.id && !!userSwapRequests
  });

  // Find automatic matches through Supabase function
  const findMatches = async () => {
    try {
      setIsFindingMatches(true);
      
      // Skip finding matches if user has no active swap requests
      if (userSwapRequests && userSwapRequests.length === 0) {
        toast({
          title: "No active swap requests",
          description: "You need to create a swap request before finding matches.",
          variant: "destructive"
        });
        return [];
      }
      
      const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
        body: { admin_secret: true }
      });
      
      if (error) throw error;
      
      // Refresh data after finding matches
      refetchMatches();
      
      toast({
        title: "Match search complete",
        description: `Found ${data.matches_created || 0} potential matches.`,
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error finding matches",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsFindingMatches(false);
    }
  };

  // Accept a leave swap match
  const acceptMatch = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase.functions.invoke('accept_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Swap accepted",
        description: "The leave block swap has been accepted."
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept swap",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  // Finalize a leave swap match
  const finalizeMatch = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase.functions.invoke('finalize_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Swap finalized",
        description: "The leave block swap has been completed."
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to finalize swap",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  // Cancel a leave swap match
  const cancelMatch = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      const { data, error } = await supabase.functions.invoke('cancel_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Swap cancelled",
        description: "The leave block swap has been cancelled."
      });
      queryClient.invalidateQueries({ queryKey: ['leave-swap-matches'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel swap",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  // Process matches to filter out duplicates and separate active/past matches
  const processMatches = () => {
    if (!leaveSwapMatches) return { activeMatches: [], pastMatches: [] };
    
    console.log('Processing matches, total count:', leaveSwapMatches.length);
    
    // Create a Map to track matches by ID, ensuring uniqueness
    const uniqueMatchesMap = new Map();
    
    // Process each match, only keeping the first occurrence of each ID
    leaveSwapMatches.forEach(match => {
      if (!uniqueMatchesMap.has(match.match_id)) {
        uniqueMatchesMap.set(match.match_id, match);
      } else {
        console.log('Skipping duplicate match ID:', match.match_id);
      }
    });
    
    const uniqueMatches = Array.from(uniqueMatchesMap.values());
    console.log('Unique matches after Map deduplication:', uniqueMatches.length);
    
    // Then separate active and past matches
    const activeMatches = uniqueMatches.filter(
      match => match.match_status === 'pending' || match.match_status === 'accepted'
    );
    
    const pastMatches = uniqueMatches.filter(
      match => match.match_status === 'completed' || match.match_status === 'cancelled'
    );
    
    console.log('Active matches:', activeMatches.length, 'Past matches:', pastMatches.length);
    
    return { activeMatches, pastMatches };
  };
  
  const { activeMatches, pastMatches } = processMatches();

  return {
    leaveSwapMatches,
    activeMatches,
    pastMatches,
    hasActiveRequests: userSwapRequests && userSwapRequests.length > 0,
    isLoadingMatches: isLoadingMatches || isLoadingRequests,
    matchesError,
    findMatches,
    isFindingMatches,
    acceptMatch: acceptMatch.mutate,
    isAcceptingMatch: acceptMatch.isPending,
    finalizeMatch: finalizeMatch.mutate,
    isFinalizingMatch: finalizeMatch.isPending,
    cancelMatch: cancelMatch.mutate,
    isCancellingMatch: cancelMatch.isPending,
    refetchMatches
  };
}
