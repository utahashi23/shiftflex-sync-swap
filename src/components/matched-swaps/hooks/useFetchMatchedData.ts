
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
      
      // Step 1: Fetch matched swap requests with basic join data
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
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`)
        .order('id', { ascending: true });
        
      if (matchedError) {
        console.error('Error fetching matched swaps:', matchedError);
        throw matchedError;
      }
      
      console.log('Active matched swaps raw data:', matchedRequests);
      
      // Step 2: Fetch completed swaps
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
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`)
        .order('id', { ascending: true });
        
      if (completedError) {
        console.error('Error fetching completed swaps:', completedError);
        throw completedError;
      }
      
      console.log('Completed swaps raw data:', completedRequests);
      
      // If no data, return empty arrays
      if ((!matchedRequests || matchedRequests.length === 0) && 
          (!completedRequests || completedRequests.length === 0)) {
        console.log('No matched or completed swaps found');
        return { matchedSwaps: [], completedSwaps: [] };
      }
      
      // Step 3: Collect all shift IDs needed for this user's swaps
      const shiftIds = new Set<string>();
      
      // Get shift IDs from matched requests
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Get shift IDs from completed requests
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Step 4: Fetch ALL shift data in a single query
      let shiftsData: any[] = [];
      if (shiftIds.size > 0) {
        console.log('Fetching shift data for IDs:', Array.from(shiftIds));
        
        const { data: shifts, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('id', Array.from(shiftIds));
          
        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError);
          throw shiftsError;
        }
        
        console.log('Fetched shifts data:', shifts?.length || 0);
        shiftsData = shifts || [];
      }
      
      // Step 5: Get all user profiles involved
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
      
      console.log('Fetched profiles data:', profilesData?.length || 0);
      
      // Create profiles map for quick lookup
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Step 6: Create a shift map for quick lookup
      const shiftMap = shiftsData.reduce((map, shift) => {
        map[shift.id] = shift;
        return map;
      }, {} as Record<string, any>);
      
      console.log('Number of matched requests before processing:', matchedRequests?.length || 0);
      console.log('Number of completed requests before processing:', completedRequests?.length || 0);
      
      // Process matched swaps using our improved function with the shift map
      const formattedActiveMatches = processSwapRequests(
        matchedRequests || [], 
        shiftMap, 
        userId, 
        profilesMap
      );
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(
        completedRequests || [], 
        shiftMap, 
        userId, 
        profilesMap
      );
      
      // Log the processed matches
      console.log(`Processed ${formattedActiveMatches.length} active matches`);
      console.log(`Processed ${formattedCompletedMatches.length} completed matches`);
      
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
