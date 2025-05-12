
import { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { toast } from '../use-toast';
import { fetchUserMatches, acceptSwapMatch, finalizeSwapMatch, completeSwapMatch, cancelSwapMatch } from './api';
import { SwapMatchesState, UseSwapMatchesReturn } from './types';

export const useSwapMatches = (): UseSwapMatchesReturn => {
  const [state, setState] = useState<SwapMatchesState>({
    matches: [],
    pastMatches: [],
    rawApiData: null,
    isLoading: true,
    error: null
  });
  
  const { user } = useAuth();
  
  const fetchMatches = async (userPerspectiveOnly: boolean = true, userInitiatorOnly: boolean = false) => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Important: We're setting userInitiatorOnly to false to ensure we get ALL matches
      // including those where the user is the acceptor
      const { matches, pastMatches, rawApiData } = await fetchUserMatches(
        user.id,
        userPerspectiveOnly, 
        userInitiatorOnly // Allowing both initiator and non-initiator matches
      );
      
      setState({
        matches,
        pastMatches,
        rawApiData,
        isLoading: false,
        error: null
      });
      
    } catch (error: any) {
      console.error('Error fetching swap matches:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      toast({
        title: "Failed to load matches",
        description: "There was a problem loading your swap matches",
        variant: "destructive"
      });
    }
  };
  
  const acceptMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await acceptSwapMatch(matchId);
      
      // Refresh matches after accepting to get updated statuses
      await fetchMatches(true, false);
      
      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap. Waiting for the other user's approval.",
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting swap match:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  const cancelMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await cancelSwapMatch(matchId);
      
      // Refresh matches after canceling
      await fetchMatches();
      
      toast({
        title: "Swap Canceled",
        description: "The shift swap has been canceled and returned to pending status",
      });
      
      return true;
    } catch (error) {
      console.error('Error canceling swap match:', error);
      toast({
        title: "Failed to cancel swap",
        description: "There was a problem canceling the swap",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  const finalizeMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await finalizeSwapMatch(matchId);
      
      // Refresh matches after finalizing
      await fetchMatches();
      
      toast({
        title: "Swap Finalized",
        description: "The shift swap has been finalized and calendars have been updated",
      });
      
      return true;
    } catch (error) {
      console.error('Error finalizing swap match:', error);
      toast({
        title: "Failed to finalize swap",
        description: "There was a problem finalizing the swap",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  const completeMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await completeSwapMatch(matchId);
      
      // Refresh matches after completing
      await fetchMatches();
      
      toast({
        title: "Swap Completed",
        description: "The shift swap has been marked as completed",
      });
      
      return true;
    } catch (error) {
      console.error('Error completing swap match:', error);
      toast({
        title: "Failed to complete swap",
        description: "There was a problem completing the swap",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  // Fetch matches when the component mounts or user changes
  useEffect(() => {
    if (user) {
      // Important: Set userInitiatorOnly to false to ensure we get all matches
      fetchMatches(true, false);
    }
  }, [user]);
  
  return {
    ...state,
    fetchMatches,
    acceptMatch,
    cancelMatch,
    finalizeMatch,
    completeMatch
  };
};
