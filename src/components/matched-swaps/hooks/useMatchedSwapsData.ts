
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/auth';
import { SwapMatch } from '@/hooks/swap-matches';
import { toast } from '@/hooks/use-toast';
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';

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
  const { user } = useAuth();
  const { findSwapMatches, isProcessing, initialFetchCompleted } = useSwapMatcher();

  /**
   * Process matches data from API response
   */
  const processMatchesData = (matchesData: any[]): SwapMatch[] => {
    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      console.log('No matches data to process');
      return [];
    }
    
    // Process and deduplicate the matches data
    const uniqueMatches = Array.from(
      new Map(matchesData.map((match: any) => [match.match_id, match])).values()
    );
    
    console.log(`Processing ${uniqueMatches.length} unique matches`);
    
    // Process the data
    return uniqueMatches.map((match: any) => {
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
        createdAt: match.created_at
      };
    });
  };

  // Helper function to get shift type based on time
  // Using explicit type assertion to match the expected type
  const getShiftType = (startTime: string): "day" | "afternoon" | "night" | "unknown" => {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour >= 5 && hour < 12) {
      return "day";
    } else if (hour >= 12 && hour < 18) {
      return "afternoon";
    } else {
      return "night";
    }
  };

  /**
   * Fetch matches data using findSwapMatches
   */
  const fetchMatches = async () => {
    // Check if user exists and there's no ongoing fetch operation
    if (!user || !user.id || isLoading || fetchInProgressRef.current) return;
    
    // Set loading state and operation flag
    setIsLoading(true);
    fetchInProgressRef.current = true;
    
    try {
      console.log('Finding matches for user:', user.id);
      
      // Directly use findSwapMatches to find and retrieve matches
      const matchesData = await findSwapMatches(user.id, true, true, true, true);
      console.log('Raw match data from function:', matchesData);
      
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
      console.log('Formatted matches:', formattedMatches);
      
      // Separate active and past matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted'
      );
      
      const completedMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${completedMatches.length} past matches`);
      
      // Update the state with the new matches
      setMatches(activeMatches);
      setPastMatches(completedMatches);
      
      // Force a re-render of the component to reflect the new state immediately
      setTimeout(() => {
        console.log('State after update (setTimeout):', { activeMatches: activeMatches.length, matches: matches.length });
      }, 0);
      
      // If we've found matches, update parent tabs if needed
      if (activeMatches.length > 0 && setRefreshTrigger) {
        setRefreshTrigger(prevVal => prevVal + 1);
        if (activeTab !== 'active') {
          setActiveTab('active');
        }
      }
      
      // Mark fetch as done only if we actually performed a fetch
      setInitialFetchDone(true);
      
      // Show toast message about the results
      if (activeMatches.length > 0) {
        toast({
          title: "Matches found!",
          description: `Found ${activeMatches.length} potential swap matches.`,
        });
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
      fetchInProgressRef.current = false; // Reset the operation flag
    }
  };

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
