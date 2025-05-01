import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

export interface SwapMatch {
  id: string;
  status: string;
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
    userId: string;
    userName: string;
  };
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
}

export interface SwapMatchesState {
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  rawApiData: any;
  isLoading: boolean;
  error: Error | null;
}

const getShiftType = (startTime: string): string => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'day';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
};

export function useSwapMatches() {
  const [state, setState] = useState<SwapMatchesState>({
    matches: [],
    pastMatches: [],
    rawApiData: null,
    isLoading: true,
    error: null
  });
  
  const { user } = useAuth();
  
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Fetching matches for user:', user.id);
      
      // Call our Edge Function to get all user matches
      const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
        body: { user_id: user.id }
      });
      
      if (matchesError) throw matchesError;
      
      console.log('Raw match data from function:', matchesData);
      
      // Save the raw API response for debugging
      setState(prev => ({ ...prev, rawApiData: matchesData }));
      
      if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
        console.log('No matches found');
        setState({
          matches: [],
          pastMatches: [],
          rawApiData: matchesData,
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Process and format the matches data
      const formattedMatches = (matchesData as any[]).map((match: any) => {
        return {
          id: match.match_id,
          status: match.match_status,
          myShift: {
            id: match.my_shift_id,
            date: match.my_shift_date,
            startTime: match.my_shift_start_time,
            endTime: match.my_shift_end_time,
            truckName: match.my_shift_truck,
            type: getShiftType(match.my_shift_start_time)
          },
          otherShift: {
            id: match.other_shift_id,
            date: match.other_shift_date,
            startTime: match.other_shift_start_time,
            endTime: match.other_shift_end_time,
            truckName: match.other_shift_truck,
            type: getShiftType(match.other_shift_start_time),
            userId: match.other_user_id,
            userName: match.other_user_name || 'Unknown User'
          },
          myRequestId: match.my_request_id,
          otherRequestId: match.other_request_id,
          createdAt: new Date(match.created_at).toISOString()
        };
      });
      
      // Separate active and past matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted'
      );
      
      const pastMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${pastMatches.length} past matches`);
      
      setState({
        matches: activeMatches,
        pastMatches: pastMatches,
        rawApiData: matchesData,
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
      
      // Call the accept_swap_match function
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
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
      
      // Call the complete_swap_match function
      const { data, error } = await supabase.functions.invoke('complete_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
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
      fetchMatches();
    }
  }, [user]);
  
  return {
    ...state,
    fetchMatches,
    acceptMatch,
    completeMatch
  };
}
