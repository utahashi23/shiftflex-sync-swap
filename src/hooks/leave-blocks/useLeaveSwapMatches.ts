
import { useState } from 'react';
import { useAuth } from '../useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../use-toast';
import { LeaveSwapMatch } from '@/types/leave-blocks';

export const useLeaveSwapMatches = () => {
  const [activeMatches, setActiveMatches] = useState<LeaveSwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<LeaveSwapMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
  const [matchesError, setMatchesError] = useState<Error | null>(null);
  const [isFindingMatches, setIsFindingMatches] = useState<boolean>(false);
  const [isAcceptingMatch, setIsAcceptingMatch] = useState<boolean>(false);
  const [isFinalizingMatch, setIsFinalizingMatch] = useState<boolean>(false);
  const [isCancellingMatch, setIsCancellingMatch] = useState<boolean>(false);
  
  const { user } = useAuth();
  
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setIsLoadingMatches(true);
      setMatchesError(null);
      
      // Call the edge function to get matches
      const { data, error } = await supabase.functions.invoke('get_user_leave_swap_matches', {
        body: { user_id: user.id }
      });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        console.log("Received matches data:", data);
        
        // Process active vs past matches
        const active = data.filter((match: LeaveSwapMatch) => 
          match.match_status === 'pending' || match.match_status === 'accepted');
        
        const past = data.filter((match: LeaveSwapMatch) => 
          match.match_status === 'completed' || match.match_status === 'cancelled');
        
        console.log(`Processed ${active.length} active matches and ${past.length} past matches`);
        
        setActiveMatches(active);
        setPastMatches(past);
      }
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      setMatchesError(error);
      toast({
        title: "Error loading matches",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMatches(false);
    }
  };
  
  const findMatches = async () => {
    if (!user) return;
    
    try {
      setIsFindingMatches(true);
      
      const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
        body: { user_id: user.id, force_check: true }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Match finding complete",
        description: data.message || "Potential matches have been processed.",
      });
      
      // Refresh matches after finding
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error finding matches:", error);
      toast({
        title: "Error finding matches",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFindingMatches(false);
    }
  };
  
  const acceptMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsAcceptingMatch(true);
      console.log(`Accepting match: ${matchId}`);
      
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        console.error("Error accepting match:", error);
        throw error;
      }
      
      console.log("Match accepted:", data);
      
      toast({
        title: "Match Accepted",
        description: "You have successfully accepted this leave swap.",
      });
      
      // Update local state to reflect the change immediately
      setActiveMatches(prevMatches => 
        prevMatches.map(match => 
          match.match_id === matchId 
            ? { ...match, match_status: 'accepted' } 
            : match
        )
      );
      
      // Refresh matches to get the latest data
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error accepting match:", error);
      toast({
        title: "Error accepting match",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAcceptingMatch(false);
    }
  };
  
  const finalizeMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsFinalizingMatch(true);
      console.log(`Finalizing match: ${matchId}`);
      
      const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Match finalized:", data);
      
      toast({
        title: "Match Finalized",
        description: "The leave swap has been finalized and calendars updated.",
      });
      
      // Update local state
      setActiveMatches(prevMatches => prevMatches.filter(match => match.match_id !== matchId));
      setPastMatches(prevMatches => [
        ...prevMatches,
        ...activeMatches.filter(match => match.match_id === matchId)
          .map(match => ({ ...match, match_status: 'completed' }))
      ]);
      
      // Refresh matches
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error finalizing match:", error);
      toast({
        title: "Error finalizing match",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFinalizingMatch(false);
    }
  };
  
  const cancelMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsCancellingMatch(true);
      console.log(`Cancelling match: ${matchId}`);
      
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Match cancelled:", data);
      
      toast({
        title: "Match Cancelled",
        description: "The leave swap has been cancelled.",
      });
      
      // Update local state
      setActiveMatches(prevMatches => prevMatches.filter(match => match.match_id !== matchId));
      setPastMatches(prevMatches => [
        ...prevMatches,
        ...activeMatches.filter(match => match.match_id === matchId)
          .map(match => ({ ...match, match_status: 'cancelled' }))
      ]);
      
      // Refresh matches
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error cancelling match:", error);
      toast({
        title: "Error cancelling match",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCancellingMatch(false);
    }
  };
  
  // Load matches when component mounts
  const refetchMatches = async () => {
    await fetchMatches();
  };
  
  return {
    activeMatches,
    pastMatches,
    isLoadingMatches,
    matchesError,
    findMatches,
    isFindingMatches,
    acceptMatch,
    isAcceptingMatch,
    finalizeMatch,
    isFinalizingMatch,
    cancelMatch,
    isCancellingMatch,
    refetchMatches,
  };
};
