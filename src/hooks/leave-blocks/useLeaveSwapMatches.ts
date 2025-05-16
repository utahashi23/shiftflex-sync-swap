
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for managing leave swap matches
 * 
 * This hook handles fetching, accepting, finalizing and cancelling leave swap matches
 */
export function useLeaveSwapMatches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  
  // First check if user has any active swap requests
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

  // Only fetch matches if there are active requests
  const {
    data: matchesData,
    isLoading: isLoadingMatches,
    error: matchesError,
    refetch: refetchMatches
  } = useQuery({
    queryKey: ['leave-swap-matches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Skip if no active requests
      if (userSwapRequests && userSwapRequests.length === 0) {
        console.log('No active swap requests, skipping match fetch');
        return [];
      }
      
      const { data, error } = await supabase
        .rpc('get_user_leave_swap_matches', { p_user_id: user.id });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && Array.isArray(userSwapRequests)
  });
  
  // Process raw matches data to ensure uniqueness and add employee ID fields
  const processedMatches = async () => {
    if (!matchesData || !Array.isArray(matchesData)) return { activeMatches: [], pastMatches: [] };
    
    // Get unique matches by match_id
    const uniqueMatches = [...new Map(matchesData.map(match => [match.match_id, match])).values()];
    console.log(`Processed ${uniqueMatches.length} unique matches from ${matchesData.length} total`);
    
    // Fetch employee IDs for my_user and other_user
    const profilePromises = uniqueMatches.map(async (match) => {
      // Get profiles for both users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, employee_id')
        .in('id', [match.other_user_id, user?.id || '']);
        
      if (!profiles) return match;
      
      const myProfile = profiles.find(p => p.id === user?.id);
      const otherProfile = profiles.find(p => p.id === match.other_user_id);
      
      return {
        ...match,
        other_employee_id: otherProfile?.employee_id || '',
        my_employee_id: myProfile?.employee_id || ''
      };
    });
    
    const enhancedMatches = await Promise.all(profilePromises);
    
    // Split into active and past matches
    const activeMatches = enhancedMatches.filter(
      match => match.match_status === 'pending' || match.match_status === 'accepted'
    );
    
    const pastMatches = enhancedMatches.filter(
      match => match.match_status === 'completed' || match.match_status === 'cancelled'
    );
    
    return { activeMatches, pastMatches };
  };
  
  // Extract and memoize the active and past matches
  const { 
    data: { activeMatches = [], pastMatches = [] } = { activeMatches: [], pastMatches: [] },
    isLoading: isProcessingMatches
  } = useQuery({
    queryKey: ['processed-leave-swap-matches', matchesData],
    queryFn: processedMatches,
    enabled: !!matchesData && Array.isArray(matchesData),
  });

  // Trigger finding leave swap matches
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

  // Accept a match
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

  // Finalize a match
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

  // Cancel a match
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

  return {
    activeMatches,
    pastMatches,
    hasActiveRequests: userSwapRequests && userSwapRequests.length > 0,
    isLoadingMatches: isLoadingMatches || isLoadingRequests || isProcessingMatches,
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
