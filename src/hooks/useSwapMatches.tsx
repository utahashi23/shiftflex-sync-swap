
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
    isLoading: true,
    error: null
  });
  
  const { user } = useAuth();
  
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call our PostgreSQL function to get all user matches
      const { data: matchesData, error: matchesError } = await supabase
        .rpc('get_user_matches', { user_id: user.id });
      
      if (matchesError) throw matchesError;
      
      console.log('Raw match data from function:', matchesData);
      
      // Get profiles data for all other users in one batch query
      const userIds = matchesData
        .map(match => match.other_user_id)
        .filter((id, index, self) => id && self.indexOf(id) === index);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Create a map of user IDs to names for quick lookup
      const userNames: Record<string, string> = {};
      profiles?.forEach(profile => {
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const email = profile.email || '';
        userNames[profile.id] = `${firstName} ${lastName}`.trim() || email || 'Unknown User';
      });
      
      // Process and format the matches data
      const formattedMatches = matchesData.map(match => {
        const userName = userNames[match.other_user_id] || 'Unknown User';
        
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
            userName
          },
          myRequestId: match.my_request_id,
          otherRequestId: match.other_request_id,
          createdAt: new Date(match.created_at).toISOString()
        };
      });
      
      // Separate active and past matches
      const activeMatches = formattedMatches.filter(match => 
        match.status === 'pending' || match.status === 'accepted'
      );
      
      const pastMatches = formattedMatches.filter(match => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${pastMatches.length} past matches`);
      
      setState({
        matches: activeMatches,
        pastMatches: pastMatches,
        isLoading: false,
        error: null
      });
      
    } catch (error) {
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
      const { data, error } = await supabase
        .rpc('accept_swap_match', { match_id: matchId });
      
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
      const { data, error } = await supabase
        .rpc('complete_swap_match', { match_id: matchId });
      
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
