
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MatchedSwap } from '../types';
import { processSwapRequests } from '../utils';

/**
 * Hook for fetching matched swaps data
 */
export const useFetchMatchedData = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  /**
   * Fetch all matched and completed swaps for a user
   */
  const fetchMatchedSwaps = async (userId: string) => {
    if (!userId) return { matchedSwaps: [], completedSwaps: [] };
    
    setIsLoading(true);
    
    try {
      console.log('Fetching matched swaps for user', userId);
      
      // Fetch matched swap requests
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .eq('status', 'matched')
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
        
      if (matchedError) {
        console.error('Error fetching matched swaps:', matchedError);
        throw matchedError;
      }
      
      console.log('Active matched swaps:', matchedRequests);
      
      // Fetch completed swaps
      const { data: completedRequests, error: completedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .eq('status', 'completed')
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
        
      if (completedError) {
        console.error('Error fetching completed swaps:', completedError);
        throw completedError;
      }
      
      console.log('Completed swaps:', completedRequests);
      
      // If no data, return empty arrays
      if ((!matchedRequests || matchedRequests.length === 0) && 
          (!completedRequests || completedRequests.length === 0)) {
        console.log('No matched or completed swaps found');
        return { matchedSwaps: [], completedSwaps: [] };
      }
      
      // Get ALL relevant shift IDs for fetching shift details
      const shiftIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Only fetch shifts if we have shift IDs
      let shiftsData: any[] = [];
      if (shiftIds.size > 0) {
        // Fetch shift data
        const { data: shifts, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('id', Array.from(shiftIds));
          
        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError);
          throw shiftsError;
        }
        
        console.log('Fetched shifts data:', shifts);
        shiftsData = shifts || [];
      }
      
      // Get user IDs involved in swaps
      const userIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id) userIds.add(req.acceptor_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id) userIds.add(req.acceptor_id);
      });
      
      // Remove admin ID and empty values
      const filteredUserIds = [...userIds].filter(id => 
        id && id !== '7c31ceb6-bec9-4ea8-b65a-b6629547b52e'
      );
      
      console.log('Fetching profiles for user IDs:', filteredUserIds);
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', filteredUserIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Fetched profiles data:', profilesData);
      
      // Create profiles map for quick lookup
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Process matches to avoid duplicates
      const processedMatchIds = new Set<string>();
      
      // Join shift data with request data for matched requests
      const matchedRequestsWithShifts = matchedRequests?.map(req => {
        const requesterShift = shiftsData?.find(s => s.id === req.requester_shift_id);
        const acceptorShift = shiftsData?.find(s => s.id === req.acceptor_shift_id);
        
        return {
          ...req,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      // Join shift data with request data for completed requests
      const completedRequestsWithShifts = completedRequests?.map(req => {
        const requesterShift = shiftsData?.find(s => s.id === req.requester_shift_id);
        const acceptorShift = shiftsData?.find(s => s.id === req.acceptor_shift_id);
        
        return {
          ...req,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      // Process active matches - the problem was here with duplicates
      const formattedActiveMatches = processSwapRequests(
        matchedRequestsWithShifts || [], 
        shiftsData || [], 
        userId, 
        profilesMap
      );
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(
        completedRequestsWithShifts || [], 
        shiftsData || [], 
        userId, 
        profilesMap
      );
      
      // Log the processed matches to debug
      console.log('Processed active matches:', formattedActiveMatches);
      console.log('Processed completed matches:', formattedCompletedMatches);
      
      // Return the unique matches
      return {
        matchedSwaps: formattedActiveMatches,
        completedSwaps: formattedCompletedMatches
      };
      
    } catch (error) {
      console.error('Error fetching matched swaps:', error);
      toast({
        title: "Failed to load matched swaps",
        description: "There was a problem loading your matched swaps. Please try again later.",
        variant: "destructive"
      });
      return { matchedSwaps: [], completedSwaps: [] };
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    fetchMatchedSwaps,
    isLoading,
    setIsLoading
  };
};
