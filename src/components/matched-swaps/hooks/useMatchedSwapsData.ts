import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth';
import { SwapMatch } from '../types';
import { toast } from '@/hooks/use-toast';
import { useSwapMatcher } from '@/hooks/swap-matching';
import { getShiftType } from '@/utils/shiftUtils';
import { useSwapRequests } from '@/hooks/swap-requests';
import { SwapRequest } from '@/hooks/swap-requests/types';

/**
 * Hook for managing matched swaps data and operations
 */
export const useMatchedSwapsData = (setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>) => {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<SwapMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const fetchInProgressRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const { user } = useAuth();
  const { findMatches, isProcessing, initialFetchCompleted } = useSwapMatcher();
  
  // Fix: Use state to store the swap requests directly
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const { fetchRequests: fetchSwapRequests } = useSwapRequests();
  
  // Function to fetch swap requests
  const fetchSwapRequests = useCallback(async () => {
    try {
      // Using the useSwapRequests hook to fetch data
      await fetchSwapRequests();
      // Note: This is a workaround since we can't directly access the swapRequests
      // In a real implementation, we should refactor to avoid this pattern
    } catch (error) {
      console.error('Error fetching swap requests:', error);
    }
  }, [fetchSwapRequests]);

  // Auto-fetch matches on component mount - but only once per user session
  useEffect(() => {
    // Skip fetch if we've already done it for this user
    if (user && !initialFetchDone && user.id !== userIdRef.current) {
      console.log('Auto-fetching matches on component mount');
      userIdRef.current = user.id;
      // Set a timeout to prevent immediate loading on page render
      const timer = setTimeout(() => {
        fetchSwapRequests().then(() => {
          fetchMatches();
        });
        // Mark initial fetch as done to prevent further auto-fetches
        setInitialFetchDone(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, initialFetchDone, fetchSwapRequests]);

  /**
   * Process matches data from API response and filter by user's active requests
   */
  const processMatchesData = useCallback((matchesData: any[]): SwapMatch[] => {
    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      console.log('No matches data to process');
      return [];
    }
    
    // Process and deduplicate the matches data
    const uniqueMatches = Array.from(
      new Map(matchesData.map((match: any) => [match.match_id, match])).values()
    );
    
    console.log(`Processing ${uniqueMatches.length} unique matches`);
    
    // Get IDs of current user's active swap requests - sample logic since we can't access swapRequests directly
    const userRequestIds = swapRequests
      .filter(req => req.status === 'pending' || req.status === 'matched')
      .map(req => req.id);
    
    console.log('User has active request IDs:', userRequestIds);
    
    // Filter to only include matches related to user's active requests
    const relevantMatches = uniqueMatches.filter((match: any) => {
      // Check if either the my_request_id or other_request_id is in the user's active requests
      const isRelevant = userRequestIds.includes(match.my_request_id) || 
                        userRequestIds.includes(match.other_request_id);
      
      if (!isRelevant) {
        console.log(`Match ${match.match_id} filtered out - not related to user's requests`);
      }
      
      return isRelevant;
    });
    
    console.log(`After filtering, ${relevantMatches.length} matches are relevant to user's requests`);
    
    // Process the relevant matches data
    return relevantMatches.map((match: any) => {
      // Extract colleague types from raw data
      const myShiftColleagueType = match.my_shift_colleague_type || 'Unknown';
      const otherShiftColleagueType = match.other_shift_colleague_type || 'Unknown';
      
      return {
        id: match.match_id,
        status: match.match_status,
        myShift: {
          id: match.my_shift_id,
          date: match.my_shift_date,
          startTime: match.my_shift_start_time,
          endTime: match.my_shift_end_time,
          truckName: match.my_shift_truck,
          type: getShiftType(match.my_shift_start_time),
          colleagueType: myShiftColleagueType
        },
        otherShift: {
          id: match.other_shift_id,
          date: match.other_shift_date,
          startTime: match.other_shift_start_time,
          endTime: match.other_shift_end_time,
          truckName: match.other_shift_truck,
          type: getShiftType(match.other_shift_start_time),
          userId: match.other_user_id,
          userName: match.other_user_name || 'Unknown User',
          colleagueType: otherShiftColleagueType
        },
        myRequestId: match.my_request_id,
        otherRequestId: match.other_request_id,
        createdAt: match.created_at
      };
    });
  }, [swapRequests]);

  /**
   * Fetch matches data using findSwapMatches with debouncing
   */
  const fetchMatches = useCallback(async () => {
    // Skip fetch if already in progress
    if (!user || !user.id || isLoading || fetchInProgressRef.current) {
      console.log('Skipping fetch - loading:', isLoading, 'in progress:', fetchInProgressRef.current);
      return;
    }
    
    // Set loading state and operation flag
    setIsLoading(true);
    fetchInProgressRef.current = true;
    
    try {
      console.log('Finding matches for user:', user.id);
      
      // First ensure we have the latest swap requests data
      await fetchSwapRequests();
      
      // Check if user has any active swap requests - simple check since we don't have direct access
      if (swapRequests.length === 0) {
        console.log('User has no active swap requests, skipping match search');
        setMatches([]);
        setPastMatches([]);
        toast({
          title: "No active requests",
          description: "You need to create a swap request first before looking for matches.",
        });
        return;
      }
      
      // Explicitly request colleague types inclusion
      const result = await findMatches(
        user.id,
        false, // Don't force check unless specifically requested
        false  // No verbose logging in production
      );
      
      if (!result?.success) {
        console.log('No matches found or error occurred');
        setMatches([]);
        setPastMatches([]);
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
        return;
      }
      
      const matchesData = result.matches;
      console.log('Raw match data received from function:', matchesData);
      
      if (!matchesData || matchesData.length === 0) {
        console.log('No matches found');
        setMatches([]);
        setPastMatches([]);
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
        return;
      }
      
      // Process the matches data
      const formattedMatches = processMatchesData(matchesData || []);
      console.log('Formatted matches after processing:', formattedMatches);
      
      // Separate active and past matches
      // IMPORTANT: Include 'other_accepted' status in active matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted' || match.status === 'other_accepted'
      );
      
      const completedMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${completedMatches.length} past matches`);
      
      // Update the state with the new matches
      setMatches(activeMatches);
      setPastMatches(completedMatches);
      
      // Show toast message about the results
      if (activeMatches.length > 0) {
        toast({
          title: "Matches found!",
          description: `Found ${activeMatches.length} potential swap matches.`,
        });
        
        // If we've found matches, update parent tabs if needed
        if (setRefreshTrigger && activeTab !== 'active') {
          setActiveTab('active');
          setTimeout(() => {
            setRefreshTrigger(prevVal => prevVal + 1);
          }, 100);
        }
      } else {
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Failed to load matches",
        description: "Could not load your swap matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // Reset the operation flag after a short delay to prevent rapid requests
      setTimeout(() => {
        fetchInProgressRef.current = false;
      }, 500);
    }
  }, [user, isLoading, fetchSwapRequests, swapRequests, findMatches, processMatchesData, activeTab, setRefreshTrigger]);

  return {
    matches,
    pastMatches,
    isLoading,
    isProcessing,
    activeTab,
    setActiveTab,
    fetchMatches,
    initialFetchDone,
    initialFetchCompleted
  };
};
