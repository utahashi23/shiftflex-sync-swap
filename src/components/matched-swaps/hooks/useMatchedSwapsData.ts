
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/auth';
import { SwapMatch } from '../types';
import { toast } from '@/hooks/use-toast';
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { getShiftType } from '@/utils/shiftUtils';

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

  // Auto-fetch matches on component mount - only once
  useEffect(() => {
    if (user && !initialFetchDone) {
      console.log('Auto-fetching matches on component mount');
      fetchMatches();
      // Mark initial fetch as done to prevent further auto-fetches
      setInitialFetchDone(true);
    }
  }, [user, initialFetchDone]);

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
    
    // Log the raw data to see what we're working with
    console.log('Raw matches data to process:', uniqueMatches);
    
    // Process the data
    return uniqueMatches.map((match: any) => {
      // Explicitly log the colleague_type fields for debugging
      console.log(`Match ${match.match_id} colleague types from API:`, {
        my_shift_colleague_type: match.my_shift_colleague_type,
        other_shift_colleague_type: match.other_shift_colleague_type
      });
      
      // Extract colleague types from raw data
      const myShiftColleagueType = match.my_shift_colleague_type || 'Unknown';
      const otherShiftColleagueType = match.other_shift_colleague_type || 'Unknown';
      
      console.log(`Match ${match.match_id} processed colleague types:`, {
        myShift: myShiftColleagueType,
        otherShift: otherShiftColleagueType
      });
      
      // Keep the match status directly from the database
      // It will now include 'otherAccepted' when appropriate
      const matchStatus = match.match_status;
      console.log(`Match ${match.match_id} status from API: ${matchStatus}`);
      
      return {
        id: match.match_id,
        status: matchStatus,
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
      
      // Explicitly request colleague types inclusion
      // Change userInitiatorOnly to false to get all matches
      const matchesData = await findSwapMatches(user.id, true, true, true, false);
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
      
      // Separate active and past matches - INCLUDE otherAccepted in active matches
      const activeMatches = formattedMatches.filter(match => 
        match.status === 'pending' || match.status === 'accepted' || match.status === 'otherAccepted'
      );
      
      const completedMatches = formattedMatches.filter(match => 
        match.status === 'completed'
      );
      
      console.log(`Found ${activeMatches.length} active matches and ${completedMatches.length} past matches`);
      
      // Count by status for debugging
      const pendingCount = activeMatches.filter(m => m.status === 'pending').length;
      const acceptedCount = activeMatches.filter(m => m.status === 'accepted').length;
      const otherAcceptedCount = activeMatches.filter(m => m.status === 'otherAccepted').length;
      console.log(`Status counts - pending: ${pendingCount}, accepted: ${acceptedCount}, otherAccepted: ${otherAcceptedCount}`);
      
      // Update state with the processed matches
      setMatches(activeMatches);
      setPastMatches(completedMatches);
      
      // Refresh the UI if needed
      if (setRefreshTrigger) {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error fetching matches",
        description: "There was a problem fetching your swap matches.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  return {
    matches,
    pastMatches,
    isLoading,
    isProcessing,
    activeTab,
    setActiveTab,
    fetchMatches
  };
};
