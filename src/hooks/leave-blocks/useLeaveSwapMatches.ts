
// This is just an example update to ensure the useLeaveSwapMatches hook returns matches with all required fields
// The actual implementation would be part of the hooks/leave-blocks directory
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

export function useLeaveSwapMatches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMatches, setActiveMatches] = useState<LeaveSwapMatch[]>([]);
  const [pastMatches, setPassMatches] = useState<LeaveSwapMatch[]>([]);
  const [hasActiveRequests, setHasActiveRequests] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<Error | null>(null);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [isAcceptingMatch, setIsAcceptingMatch] = useState(false);
  const [isFinalizingMatch, setIsFinalizingMatch] = useState(false);
  const [isCancellingMatch, setIsCancellingMatch] = useState(false);

  // Fetch matches from the database
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      setIsLoadingMatches(true);
      setMatchesError(null);
      
      // Check if the user has any active swap requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('leave_swap_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) throw requestsError;
      
      setHasActiveRequests(requestsData && requestsData.length > 0);
      
      // Get user profile data for displaying names
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, employee_id')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      // Fetch all matches for the user (both as requester and acceptor)
      const { data: matchesData, error: matchesError } = await supabase.rpc('get_user_leave_swap_matches', {
        p_user_id: user.id
      });
      
      if (matchesError) throw matchesError;

      if (matchesData) {
        console.log("Raw matches data:", matchesData);
        
        // Fetch other users' profiles for their employee IDs
        const otherUserIds = matchesData.map(match => match.other_user_id);
        const { data: otherProfilesData, error: otherProfilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, employee_id')
          .in('id', otherUserIds);
          
        if (otherProfilesError) throw otherProfilesError;
        
        // Create a map for quick lookup of other user profiles
        const otherProfilesMap = new Map();
        if (otherProfilesData) {
          otherProfilesData.forEach(profile => {
            otherProfilesMap.set(profile.id, {
              name: `${profile.first_name} ${profile.last_name}`,
              employee_id: profile.employee_id || 'N/A'
            });
          });
        }
        
        // Transform to ensure all required fields are present
        const transformedMatches = matchesData.map(match => {
          const otherProfile = otherProfilesMap.get(match.other_user_id) || { name: 'Unknown User', employee_id: 'N/A' };
          
          // Create complete match object with all required properties
          const transformedMatch: LeaveSwapMatch = {
            match_id: match.match_id,
            match_status: match.match_status,
            created_at: match.created_at,
            my_leave_block_id: match.my_leave_block_id,
            my_block_number: match.my_block_number,
            my_start_date: match.my_start_date,
            my_end_date: match.my_end_date,
            other_leave_block_id: match.other_leave_block_id,
            other_block_number: match.other_block_number,
            other_start_date: match.other_start_date,
            other_end_date: match.other_end_date,
            other_user_id: match.other_user_id,
            other_user_name: otherProfile.name,
            other_employee_id: otherProfile.employee_id,
            is_requester: match.is_requester,
            my_user_name: profileData ? `${profileData.first_name} ${profileData.last_name}` : 'Current User',
            my_employee_id: profileData?.employee_id || 'N/A',
            // Use optional chaining for these properties that may not exist in all response items
            split_designation: match.split_designation || null,
            original_block_id: match.original_block_id || null
          };
          
          return transformedMatch;
        });

        console.log("Transformed matches:", transformedMatches);

        // Deduplicate matches based on match_id
        const activeMatchesMap = new Map<string, LeaveSwapMatch>();
        const pastMatchesMap = new Map<string, LeaveSwapMatch>();
        
        transformedMatches.forEach(match => {
          if (['pending', 'accepted'].includes(match.match_status)) {
            activeMatchesMap.set(match.match_id, match);
          } else if (['completed', 'cancelled'].includes(match.match_status)) {
            pastMatchesMap.set(match.match_id, match);
          }
        });
        
        setActiveMatches(Array.from(activeMatchesMap.values()));
        setPassMatches(Array.from(pastMatchesMap.values()));
      }
    } catch (error) {
      console.error('Error fetching leave swap matches:', error);
      setMatchesError(error as Error);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Find potential matches for the user's swap requests
  const findMatches = async () => {
    if (!user) return;
    
    try {
      setIsFindingMatches(true);
      
      const { data, error } = await supabase.functions.invoke('find_leave_swap_matches', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Search complete",
        description: data?.matchesFound > 0 
          ? `Found ${data.matchesFound} potential leave swaps.` 
          : "No new matches found at this time.",
      });
      
      // Refresh the matches list
      fetchMatches();
      
    } catch (error) {
      console.error('Error finding matches:', error);
      toast({
        title: "Error finding matches",
        description: "There was a problem searching for leave swap matches.",
        variant: "destructive",
      });
    } finally {
      setIsFindingMatches(false);
    }
  };

  // Accept a leave swap match
  const acceptMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsAcceptingMatch(true);
      
      const { data, error } = await supabase.functions.invoke('accept_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap accepted",
        description: "You have successfully accepted the leave swap.",
      });
      
      // Refresh the matches list
      fetchMatches();
      
    } catch (error) {
      console.error('Error accepting match:', error);
      toast({
        title: "Error accepting swap",
        description: "There was a problem accepting the leave swap.",
        variant: "destructive",
      });
    } finally {
      setIsAcceptingMatch(false);
    }
  };

  // Finalize a leave swap match
  const finalizeMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsFinalizingMatch(true);
      
      const { data, error } = await supabase.functions.invoke('finalize_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap finalized",
        description: "The leave swap has been successfully finalized.",
      });
      
      // Refresh the matches list
      fetchMatches();
      
    } catch (error) {
      console.error('Error finalizing match:', error);
      toast({
        title: "Error finalizing swap",
        description: "There was a problem finalizing the leave swap.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizingMatch(false);
    }
  };

  // Cancel a leave swap match
  const cancelMatch = async ({ matchId }: { matchId: string }) => {
    if (!user || !matchId) return;
    
    try {
      setIsCancellingMatch(true);
      
      const { data, error } = await supabase.functions.invoke('cancel_leave_swap', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap cancelled",
        description: "The leave swap has been cancelled.",
      });
      
      // Refresh the matches list
      fetchMatches();
      
    } catch (error) {
      console.error('Error cancelling match:', error);
      toast({
        title: "Error cancelling swap",
        description: "There was a problem cancelling the leave swap.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingMatch(false);
    }
  };

  // Fetch matches when the user changes or the component mounts
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  return {
    activeMatches,
    pastMatches,
    hasActiveRequests,
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
    refetchMatches: fetchMatches
  };
}
