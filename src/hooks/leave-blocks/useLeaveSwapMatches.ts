
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../use-toast';
import { LeaveSwapMatch } from '@/types/leave-blocks';

export const useLeaveSwapMatches = () => {
  // Data states
  const [activeMatches, setActiveMatches] = useState<LeaveSwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<LeaveSwapMatch[]>([]);
  
  // Loading states
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [isFindingMatches, setIsFindingMatches] = useState<boolean>(false);
  const [isAcceptingMatch, setIsAcceptingMatch] = useState<boolean>(false);
  const [isFinalizingMatch, setIsFinalizingMatch] = useState<boolean>(false);
  const [isCancellingMatch, setIsCancellingMatch] = useState<boolean>(false);
  
  // Error and connection states
  const [matchesError, setMatchesError] = useState<Error | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [retryTimeout, setRetryTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  
  // Fetch matches with retry mechanism
  const fetchMatches = useCallback(async () => {
    if (!user) return;
    
    // Clear any existing timeout to avoid overlapping retries
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }

    try {
      setIsLoadingMatches(true);
      setMatchesError(null);
      setConnectionError(false);
      
      console.log(`Fetching leave swap matches for user ${user.id}...`);
      
      // Attempt to call the edge function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await Promise.race([
          supabase.functions.invoke('get_user_leave_swap_matches', {
            body: { user_id: user.id },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        // @ts-ignore: Type check on response
        const { data, error } = response;
        
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          // Process active vs past matches
          const active = data.filter(match => 
            match.match_status === 'pending' || match.match_status === 'accepted');
          
          const past = data.filter(match => 
            match.match_status === 'completed' || match.match_status === 'cancelled');
          
          setActiveMatches(active);
          setPastMatches(past);
          setRetryCount(0); // Reset retry count on successful fetch
        } else {
          setActiveMatches([]);
          setPastMatches([]);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Check if it's a connection/timeout issue
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('AbortError') ||
            fetchError.message?.includes('Failed to send') ||
            fetchError.message?.includes('Request timed out')) {
          console.warn('Connection issue detected:', fetchError.message);
          setConnectionError(true);
          
          // Implement exponential backoff for retries, but only if we're not at max retries
          if (retryCount < 3) {
            const nextRetryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
            console.log(`Will retry in ${nextRetryDelay}ms (attempt ${retryCount + 1}/3)`);
            
            const timeout = setTimeout(() => {
              setRetryCount(prevCount => prevCount + 1);
              fetchMatches();
            }, nextRetryDelay);
            
            setRetryTimeout(timeout);
          } else {
            toast({
              title: "Connection Error",
              description: "Could not connect to the server after multiple attempts. Please try again later.",
              variant: "destructive",
            });
          }
        } else {
          // For other errors, just throw to be caught by the outer catch
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      setMatchesError(error);
      
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
  }, [user, retryCount, connectionError, retryTimeout]);
  
  // Auto-fetch matches when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
    
    // Clean up any pending retry timeouts on unmount
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user]);
  
  // Find matches function
  const findMatches = async () => {
    if (!user) return;
    
    try {
      setIsFindingMatches(true);
      setConnectionError(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await Promise.race([
          supabase.functions.invoke('find_leave_swap_matches', {
            body: { user_id: user.id, force_check: true },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        // @ts-ignore: Type check on response
        const { data, error } = response;
        
        if (error) throw error;
        
        toast({
          title: "Match finding complete",
          description: data.message || "Potential matches have been processed.",
        });
        
        // Refresh the matches to see new ones
        await fetchMatches();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('AbortError') ||
            fetchError.message?.includes('Failed to send') ||
            fetchError.message?.includes('Request timed out')) {
          setConnectionError(true);
          throw new Error("Connection error: Could not connect to the server.");
        } else {
          throw fetchError;
        }
      }
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
  
  // Accept match function
  const acceptMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsAcceptingMatch(true);
      setConnectionError(false);
      console.log(`Accepting match: ${matchId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await Promise.race([
          supabase.functions.invoke('accept_swap_match', {
            body: { match_id: matchId },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        // @ts-ignore: Type check on response
        const { data, error } = response;
        
        if (error) throw error;
        
        console.log("Match accepted:", data);
        
        toast({
          title: "Match Accepted",
          description: data.message || "You have successfully accepted this leave swap.",
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('AbortError') ||
            fetchError.message?.includes('Failed to send') ||
            fetchError.message?.includes('Request timed out')) {
          setConnectionError(true);
          throw new Error("Connection error: Could not connect to the server.");
        } else {
          throw fetchError;
        }
      }
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
  
  // Finalize match function
  const finalizeMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsFinalizingMatch(true);
      setConnectionError(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await Promise.race([
          supabase.functions.invoke('finalize_swap_match', {
            body: { match_id: matchId },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        // @ts-ignore: Type check on response
        const { data, error } = response;
        
        if (error) throw error;
        
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('AbortError') ||
            fetchError.message?.includes('Failed to send') ||
            fetchError.message?.includes('Request timed out')) {
          setConnectionError(true);
          throw new Error("Connection error: Could not connect to the server.");
        } else {
          throw fetchError;
        }
      }
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
  
  // Cancel match function
  const cancelMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsCancellingMatch(true);
      setConnectionError(false);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const response = await Promise.race([
          supabase.functions.invoke('cancel_swap_match', {
            body: { match_id: matchId },
            signal: controller.signal
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out")), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        
        // @ts-ignore: Type check on response
        const { data, error } = response;
        
        if (error) throw error;
        
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('AbortError') ||
            fetchError.message?.includes('Failed to send') ||
            fetchError.message?.includes('Request timed out')) {
          setConnectionError(true);
          throw new Error("Connection error: Could not connect to the server.");
        } else {
          throw fetchError;
        }
      }
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
  
  // Manual function to refresh matches with retry reset
  const refetchMatches = useCallback(async () => {
    setRetryCount(0); // Reset retry count on manual refresh
    await fetchMatches();
  }, [fetchMatches]);
  
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
