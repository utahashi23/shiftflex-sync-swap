
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/auth';
import { SwapMatch } from '../types';
import { toast } from '@/hooks/use-toast';
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { getShiftType } from '@/utils/shiftUtils';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for managing matched swaps data and operations
 */
export const useMatchedSwapsData = (setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>) => {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<SwapMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [debugData, setDebugData] = useState<any>({ potentialMatches: [], rawData: null });
  const fetchInProgressRef = useRef(false);
  const { user } = useAuth();
  const { findSwapMatches, isProcessing, initialFetchCompleted } = useSwapMatcher();

  // Direct database fetch for debugging
  const fetchDirectFromDatabase = async () => {
    if (!user) return;
    
    try {
      console.log('Direct fetch from database - checking for potential matches');
      
      // First, try direct fetch from potential matches table
      const { data: potentialMatches, error: potentialMatchesError } = await supabase
        .from('shift_swap_potential_matches')
        .select(`
          id, 
          status, 
          created_at, 
          requester_request_id, 
          acceptor_request_id, 
          requester_shift_id,
          acceptor_shift_id
        `)
        .or(`requester_request_id.eq.(select id from shift_swap_requests where requester_id.eq.${user.id}),acceptor_request_id.eq.(select id from shift_swap_requests where requester_id.eq.${user.id})`);
      
      if (potentialMatchesError) {
        console.error('Error fetching potential matches:', potentialMatchesError);
      } else {
        console.log('Direct fetch from potential_matches result:', potentialMatches);
        
        // Update debug data with what we found
        setDebugData(prev => ({ ...prev, potentialMatches }));
      }
      
      // Try getting the requests we're involved in
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id, status, requester_id, requester_shift_id')
        .eq('requester_id', user.id);
      
      if (requestsError) {
        console.error('Error fetching user requests:', requestsError);
      } else {
        console.log('User requests found:', requests);
        setDebugData(prev => ({ ...prev, requests }));
        
        // If we have requests, check for matches for each request
        if (requests && requests.length > 0) {
          const allMatches = [];
          
          for (const request of requests) {
            const { data: matchesForRequest, error: matchError } = await supabase
              .from('shift_swap_potential_matches')
              .select('*')
              .or(`requester_request_id.eq.${request.id},acceptor_request_id.eq.${request.id}`);
              
            if (matchError) {
              console.error(`Error getting matches for request ${request.id}:`, matchError);
            } else if (matchesForRequest && matchesForRequest.length > 0) {
              console.log(`Found ${matchesForRequest.length} matches for request ${request.id}:`, matchesForRequest);
              allMatches.push(...matchesForRequest);
            }
          }
          
          setDebugData(prev => ({ ...prev, matchesPerRequest: allMatches }));
        }
      }
    } catch (error) {
      console.error('Error in direct database fetch:', error);
    }
  };

  // Auto-fetch matches on component mount - only once
  useEffect(() => {
    if (user && !initialFetchDone) {
      console.log('Auto-fetching matches on component mount');
      fetchMatches();
      fetchDirectFromDatabase(); // Also fetch direct from database for debugging
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
    setDebugData(prev => ({ ...prev, rawData: uniqueMatches }));
    
    // Process the data
    return uniqueMatches.map((match: any) => {
      // Extract colleague types from raw data
      const myShiftColleagueType = match.my_shift_colleague_type || 'Unknown';
      const otherShiftColleagueType = match.other_shift_colleague_type || 'Unknown';
      
      // Extract employee IDs from raw data
      const myUserEmployeeId = match.my_user_employee_id || null;
      const otherUserEmployeeId = match.other_user_employee_id || null;
      
      console.log(`Match ${match.match_id} employee IDs:`, {
        myEmployeeId: myUserEmployeeId,
        otherEmployeeId: otherUserEmployeeId
      });
      
      // Log the match status for debugging
      console.log(`Processing match ${match.match_id} with status: ${match.match_status}`);
      
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
          colleagueType: myShiftColleagueType,
          employeeId: myUserEmployeeId // Include employee ID for myShift
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
          employeeId: otherUserEmployeeId, // Include employee ID for otherShift
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
      
      // Explicitly request employee IDs inclusion
      const matchesData = await findSwapMatches(user.id, true, true, true, true);
      console.log('Raw match data received from function:', matchesData);
      
      if (!matchesData || matchesData.length === 0) {
        console.log('No matches found');
        setMatches([]);
        setPastMatches([]);
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
        
        // Fetch directly from database to debug
        fetchDirectFromDatabase();
        return;
      }
      
      // Process the matches data
      const formattedMatches = processMatchesData(matchesData || []);
      console.log('Formatted matches after processing:', formattedMatches);
      
      // Separate active and past matches
      // IMPORTANT: Include 'accepted' and 'other_accepted' status in active matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted' || match.status === 'other_accepted'
      );
      
      const completedMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${completedMatches.length} past matches`);
      console.log(`Active matches - pending: ${activeMatches.filter(m => m.status === 'pending').length}, accepted: ${activeMatches.filter(m => m.status === 'accepted').length}, other_accepted: ${activeMatches.filter(m => m.status === 'other_accepted').length}`);
      
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
        
        // Fetch directly from database to debug
        fetchDirectFromDatabase();
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Failed to load matches",
        description: "Could not load your swap matches. Please try again.",
        variant: "destructive"
      });
      
      // Fetch directly from database to debug
      fetchDirectFromDatabase();
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
    initialFetchCompleted,
    debugData, // Expose debug data for UI
    fetchDirectFromDatabase // Expose direct fetch for manual debugging
  };
};
