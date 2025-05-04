
import { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { toast } from '../use-toast';
import { fetchUserMatches, acceptSwapMatch, completeSwapMatch } from './api';
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
  
  const fetchMatches = async (userPerspectiveOnly: boolean = true, userInitiatorOnly: boolean = true) => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { matches, pastMatches, rawApiData } = await fetchUserMatches(user.id, userPerspectiveOnly, userInitiatorOnly);
      
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
      
      // Refresh matches after accepting
      await fetchMatches();
      
      toast({
        title: "Swap Accepted",
        description: "You have successfully accepted the swap",
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
      fetchMatches(true, true); // Default to only user perspective and user as initiator
    }
  }, [user]);
  
  return {
    ...state,
    fetchMatches,
    acceptMatch,
    completeMatch
  };
};
