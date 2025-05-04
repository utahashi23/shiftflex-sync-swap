
import { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { toast } from '../use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapMatch } from './types';

export const useSimpleSwapMatches = () => {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<SwapMatch[]>([]);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
  
  // Function to fetch all user's matches with proper formatting
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all requests from this user to identify potential matches
      const { data: userRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id')
        .eq('requester_id', user.id);
        
      if (requestsError) throw requestsError;
      
      if (!userRequests || userRequests.length === 0) {
        setMatches([]);
        setPastMatches([]);
        setRawApiData([]);
        return;
      }
      
      const userRequestIds = userRequests.map(req => req.id);
      
      // Get all potential matches involving this user
      const { data: potentialMatches, error: matchesError } = await supabase
        .from('shift_swap_potential_matches')
        .select(`
          id,
          status,
          created_at,
          match_date,
          requester_request_id,
          acceptor_request_id,
          requester_shift_id,
          acceptor_shift_id
        `)
        .or(`
          requester_request_id.in.(${userRequestIds.join(',')}),
          acceptor_request_id.in.(${userRequestIds.join(',')})
        `);
        
      if (matchesError) throw matchesError;
      
      setRawApiData(potentialMatches);
      
      if (!potentialMatches || potentialMatches.length === 0) {
        setMatches([]);
        setPastMatches([]);
        return;
      }
      
      // Format the matches
      const formattedMatches = await formatMatches(potentialMatches, user.id);
      
      // Split into active and completed matches
      const active = formattedMatches.filter(m => m.status === 'pending' || m.status === 'accepted');
      const completed = formattedMatches.filter(m => m.status === 'completed');
      
      setMatches(active);
      setPastMatches(completed);
      
    } catch (error: any) {
      console.error('Error fetching swap matches:', error);
      setError(error);
      toast({
        title: "Failed to load matches",
        description: "There was a problem loading your swap matches",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to accept a match
  const acceptMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setIsLoading(true);
      
      // Update the match status
      const { data, error } = await supabase
        .from('shift_swap_potential_matches')
        .update({ status: 'accepted' })
        .eq('id', matchId)
        .select();
        
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
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to complete a match
  const completeMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    try {
      setIsLoading(true);
      
      // Update the match status
      const { data, error } = await supabase
        .from('shift_swap_potential_matches')
        .update({ status: 'completed' })
        .eq('id', matchId)
        .select();
        
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
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to format matches
  const formatMatches = async (matches, userId) => {
    if (!matches || matches.length === 0) return [];
    
    // Gather all the IDs we need to fetch
    const requestIds = new Set();
    const shiftIds = new Set();
    
    matches.forEach(match => {
      requestIds.add(match.requester_request_id);
      requestIds.add(match.acceptor_request_id);
      shiftIds.add(match.requester_shift_id);
      shiftIds.add(match.acceptor_shift_id);
    });
    
    // Fetch all the requests
    const { data: requests, error: requestsError } = await supabase
      .from('shift_swap_requests')
      .select('id, requester_id')
      .in('id', Array.from(requestIds));
      
    if (requestsError) {
      console.error("Error fetching requests for display:", requestsError);
      return [];
    }
    
    // Fetch all the shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, date, start_time, end_time, truck_name, user_id')
      .in('id', Array.from(shiftIds));
      
    if (shiftsError) {
      console.error("Error fetching shifts for display:", shiftsError);
      return [];
    }
    
    // Create lookup maps
    const requestsMap = {};
    requests.forEach(req => { requestsMap[req.id] = req; });
    
    const shiftsMap = {};
    shifts.forEach(shift => { shiftsMap[shift.id] = shift; });
    
    // Get unique user IDs to fetch profiles
    const userIds = new Set();
    requests.forEach(req => { userIds.add(req.requester_id); });
    shifts.forEach(shift => { userIds.add(shift.user_id); });
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', Array.from(userIds));
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }
    
    const profilesMap = {};
    profiles?.forEach(profile => { 
      profilesMap[profile.id] = profile;
    });
    
    // Format the matches
    return matches.map(match => {
      // Determine which request belongs to the current user
      const requesterRequest = requestsMap[match.requester_request_id];
      const acceptorRequest = requestsMap[match.acceptor_request_id];
      
      // Determine if the current user is the requester or acceptor
      const isRequester = requesterRequest && requesterRequest.requester_id === userId;
      
      // Get the shifts
      const requesterShift = shiftsMap[match.requester_shift_id];
      const acceptorShift = shiftsMap[match.acceptor_shift_id];
      
      // Determine "my" shift and "other" shift based on who the current user is
      const myShift = isRequester ? requesterShift : acceptorShift;
      const otherShift = isRequester ? acceptorShift : requesterShift;
      
      // Get the other user's info
      const otherUserId = isRequester ? 
        (acceptorRequest ? acceptorRequest.requester_id : null) : 
        (requesterRequest ? requesterRequest.requester_id : null);
      
      const otherProfile = profilesMap[otherUserId];
      const otherUserName = otherProfile ? 
        `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
        'Unknown User';
      
      // Handle shift type based on start time
      const getShiftType = (startTime) => {
        if (!startTime) return 'day';
        const hour = parseInt(startTime.split(':')[0], 10);
        if (hour <= 8) return 'day';
        if (hour > 8 && hour < 16) return 'afternoon';
        return 'night';
      };
      
      return {
        id: match.id,
        status: match.status,
        createdAt: match.created_at,
        myRequestId: isRequester ? match.requester_request_id : match.acceptor_request_id,
        otherRequestId: isRequester ? match.acceptor_request_id : match.requester_request_id,
        myShift: {
          id: myShift?.id,
          date: myShift?.date,
          startTime: myShift?.start_time,
          endTime: myShift?.end_time,
          truckName: myShift?.truck_name,
          type: getShiftType(myShift?.start_time)
        },
        otherShift: {
          id: otherShift?.id,
          date: otherShift?.date,
          startTime: otherShift?.start_time,
          endTime: otherShift?.end_time,
          truckName: otherShift?.truck_name,
          type: getShiftType(otherShift?.start_time),
          userId: otherUserId,
          userName: otherUserName
        }
      };
    });
  };
  
  // Fetch matches when the component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);
  
  return {
    matches,
    pastMatches,
    rawApiData,
    isLoading,
    error,
    fetchMatches,
    acceptMatch,
    completeMatch
  };
};
