
import { useState, useEffect } from 'react';
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
  const [retryCount, setRetryCount] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  
  const { user } = useAuth();
  
  // Use effect to automatically fetch matches when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);
  
  // Use effect for retry logic
  useEffect(() => {
    // If there was an error and we haven't exceeded retry attempts
    if (matchesError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying fetch matches (attempt ${retryCount + 1})...`);
        setRetryCount(prev => prev + 1);
        fetchMatches();
      }, 2000); // Retry after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [matchesError, retryCount]);
  
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setIsLoadingMatches(true);
      setMatchesError(null);
      setConnectionError(false);
      
      console.log(`Fetching leave swap matches for user ${user.id}...`);
      
      // Try to simulate data when the connection fails (for development/testing)
      let data;
      let error;
      
      try {
        // Call the edge function to get matches
        const response = await supabase.functions.invoke('get_user_leave_swap_matches', {
          body: { user_id: user.id }
        });
        
        data = response.data;
        error = response.error;
      } catch (fetchError: any) {
        // Check if it's a connection issue
        if (fetchError.message?.includes('Failed to send a request to the Edge Function')) {
          setConnectionError(true);
          console.warn('Connection to Supabase edge functions failed. Using demo data instead.');
          
          // Mock empty data for now - we could add demo data here if needed
          data = [];
          error = null;
        } else {
          // Re-throw other errors
          throw fetchError;
        }
      }
      
      if (error) {
        console.error("Error from Supabase function:", error);
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
        // Reset retry count on successful fetch
        setRetryCount(0);
      } else {
        console.log("No match data returned from function");
        setActiveMatches([]);
        setPastMatches([]);
      }
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      setMatchesError(error);
      
      // Only show toast for errors that aren't connection-related
      if (!connectionError) {
        toast({
          title: "Error loading matches",
          description: error.message || "Failed to load leave swap matches",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingMatches(false);
    }
  };
  
  const findMatches = async () => {
    if (!user) return;
    
    try {
      setIsFindingMatches(true);
      
      console.log("Invoking find_leave_swap_matches function...");
      
      try {
        const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
          body: { user_id: user.id, force_check: true }
        });
        
        if (error) {
          console.error("Error finding matches:", error);
          throw error;
        }
        
        console.log("Find matches response:", data);
        
        toast({
          title: "Match finding complete",
          description: data.message || "Potential matches have been processed.",
        });
      } catch (fetchError: any) {
        // Handle connection errors specially
        if (fetchError.message?.includes('Failed to send a request to the Edge Function')) {
          setConnectionError(true);
          toast({
            title: "Connection Error",
            description: "Could not connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
          });
        } else {
          throw fetchError;
        }
      }
      
      // Refresh matches after finding (even if there was an error, to ensure UI is consistent)
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error finding matches:", error);
      toast({
        title: "Error finding matches",
        description: error.message || "Failed to find potential matches",
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
      
      try {
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
      } catch (fetchError: any) {
        // Handle connection errors specially
        if (fetchError.message?.includes('Failed to send a request to the Edge Function')) {
          setConnectionError(true);
          toast({
            title: "Connection Error",
            description: "Could not connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
          });
        } else {
          throw fetchError;
        }
      }
      
      // Refresh matches to get the latest data
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error accepting match:", error);
      toast({
        title: "Error accepting match",
        description: error.message || "Failed to accept leave swap",
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
      
      try {
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
      } catch (fetchError: any) {
        // Handle connection errors specially
        if (fetchError.message?.includes('Failed to send a request to the Edge Function')) {
          setConnectionError(true);
          toast({
            title: "Connection Error",
            description: "Could not connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
          });
        } else {
          throw fetchError;
        }
      }
      
      // Refresh matches
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error finalizing match:", error);
      toast({
        title: "Error finalizing match",
        description: error.message || "Failed to finalize leave swap",
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
      
      try {
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
      } catch (fetchError: any) {
        // Handle connection errors specially
        if (fetchError.message?.includes('Failed to send a request to the Edge Function')) {
          setConnectionError(true);
          toast({
            title: "Connection Error",
            description: "Could not connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
          });
        } else {
          throw fetchError;
        }
      }
      
      // Refresh matches
      await fetchMatches();
      
    } catch (error: any) {
      console.error("Error cancelling match:", error);
      toast({
        title: "Error cancelling match",
        description: error.message || "Failed to cancel leave swap",
        variant: "destructive",
      });
    } finally {
      setIsCancellingMatch(false);
    }
  };
  
  // Manual function to refresh matches
  const refetchMatches = async () => {
    setRetryCount(0); // Reset retry count on manual refresh
    await fetchMatches();
  };
  
  return {
    activeMatches,
    pastMatches,
    isLoadingMatches,
    matchesError,
    connectionError,
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
