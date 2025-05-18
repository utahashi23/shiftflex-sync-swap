
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LeaveSwapMatch } from '@/types/leave-blocks';

interface LeaveSwapMatchState {
  activeMatches: LeaveSwapMatch[];
  pastMatches: LeaveSwapMatch[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
  hasActiveRequests: boolean;
}

export const useLeaveSwapMatches = () => {
  const [state, setState] = useState<LeaveSwapMatchState>({
    activeMatches: [],
    pastMatches: [],
    isLoadingMatches: false,
    matchesError: null,
    hasActiveRequests: false
  });
  
  const { user } = useAuth();
  
  // Check if the user has any active leave swap requests
  const checkForActiveRequests = useCallback(async () => {
    if (!user) return false;
    
    try {
      const { data: requests, error } = await supabase
        .from('leave_swap_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .limit(1);
      
      return !error && requests && requests.length > 0;
    } catch (error) {
      console.error('Error checking for active requests:', error);
      return false;
    }
  }, [user]);
  
  // Fetch all leave swap matches for the user
  const fetchMatches = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({ ...prev, isLoadingMatches: true, matchesError: null }));
    
    try {
      // Check if user has active requests
      const hasRequests = await checkForActiveRequests();
      
      // Fetch matches data from the database
      const { data, error } = await supabase.functions.invoke('get_leave_swap_matches', {
        body: { 
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      const matches = data?.matches || [];
      
      // Separate active and past matches
      const activeMatches = matches.filter((match: LeaveSwapMatch) => 
        match.match_status === 'pending' || 
        match.match_status === 'accepted' ||
        match.match_status === 'other_accepted'
      );
      
      const pastMatches = matches.filter((match: LeaveSwapMatch) => 
        match.match_status === 'completed' || 
        match.match_status === 'cancelled'
      );
      
      setState({
        activeMatches,
        pastMatches,
        isLoadingMatches: false,
        matchesError: null,
        hasActiveRequests: hasRequests
      });
      
    } catch (error) {
      console.error('Error fetching leave swap matches:', error);
      setState(prev => ({ 
        ...prev, 
        isLoadingMatches: false,
        matchesError: error as Error
      }));
      
      toast({
        title: "Failed to load matches",
        description: "There was a problem loading your leave swap matches",
        variant: "destructive"
      });
    }
  }, [user, checkForActiveRequests]);
  
  // Find potential matches for the user's leave swap requests
  const findMatches = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({ ...prev, isLoadingMatches: true }));
    
    try {
      // Call the find matches function
      const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
        body: {
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // Refresh matches after finding
      await fetchMatches();
      
      if (data.matches_created > 0) {
        toast({
          title: "Matches Found!",
          description: `Found ${data.matches_created} potential leave block matches.`
        });
      } else {
        toast({
          title: "No Matches Found",
          description: "No potential leave block matches were found at this time."
        });
      }
      
    } catch (error) {
      console.error('Error finding matches:', error);
      setState(prev => ({ ...prev, isLoadingMatches: false }));
      
      toast({
        title: "Failed to find matches",
        description: "There was a problem searching for leave block matches",
        variant: "destructive"
      });
    }
  }, [user, fetchMatches]);
  
  // Accept a match
  const acceptMatch = useCallback(async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isAcceptingMatch: true }));
      
      const { error } = await supabase.functions.invoke('accept_leave_swap', {
        body: {
          match_id: matchId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // Refresh matches after accepting
      await fetchMatches();
      
      toast({
        title: "Swap Accepted",
        description: "You have accepted the leave block swap."
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting leave swap:', error);
      
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the leave block swap",
        variant: "destructive"
      });
      
      setState(prev => ({ ...prev, isAcceptingMatch: false }));
      return false;
    }
  }, [user, fetchMatches]);
  
  // Cancel a match
  const cancelMatch = useCallback(async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isCancellingMatch: true }));
      
      const { error } = await supabase.functions.invoke('cancel_leave_swap', {
        body: {
          match_id: matchId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // Refresh matches after cancelling
      await fetchMatches();
      
      toast({
        title: "Swap Cancelled",
        description: "The leave block swap has been cancelled."
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling leave swap:', error);
      
      toast({
        title: "Failed to cancel swap",
        description: "There was a problem cancelling the leave block swap",
        variant: "destructive"
      });
      
      setState(prev => ({ ...prev, isCancellingMatch: false }));
      return false;
    }
  }, [user, fetchMatches]);
  
  // Finalize a match
  const finalizeMatch = useCallback(async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isFinalizingMatch: true }));
      
      const { error } = await supabase.functions.invoke('finalize_leave_swap', {
        body: {
          match_id: matchId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // Refresh matches after finalizing
      await fetchMatches();
      
      toast({
        title: "Swap Finalized",
        description: "The leave block swap has been finalized and calendars updated."
      });
      
      return true;
    } catch (error) {
      console.error('Error finalizing leave swap:', error);
      
      toast({
        title: "Failed to finalize swap",
        description: "There was a problem finalizing the leave block swap",
        variant: "destructive"
      });
      
      setState(prev => ({ ...prev, isFinalizingMatch: false }));
      return false;
    }
  }, [user, fetchMatches]);
  
  // Initial fetch when the component mounts
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, fetchMatches]);
  
  return {
    ...state,
    isFindingMatches: state.isLoadingMatches,
    isAcceptingMatch: false,
    isFinalizingMatch: false,
    isCancellingMatch: false,
    findMatches,
    acceptMatch,
    cancelMatch,
    finalizeMatch,
    refetchMatches: fetchMatches
  };
};
