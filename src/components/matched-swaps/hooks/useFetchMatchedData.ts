
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
      
      // Fetch matched swap requests where the user is either requester or acceptor
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'matched')
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
        
      if (matchedError) {
        console.error('Error fetching matched swaps:', matchedError);
        throw matchedError;
      }
      
      console.log('Active matched swaps raw data:', matchedRequests);
      
      // Fetch completed swaps
      const { data: completedRequests, error: completedError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'completed')
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
        
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
      
      // Get ALL relevant shift IDs for fetching shifts data
      const shiftIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Convert Set to Array, removing any null or undefined values
      const shiftIdArray = Array.from(shiftIds).filter(Boolean);
      console.log('Fetching shift data for IDs:', shiftIdArray);
      
      // Fetch all shifts data in one request
      let shiftsData: any[] = [];
      if (shiftIdArray.length > 0) {
        // Batch shifts into smaller groups to prevent URL length limits
        const batchSize = 5;
        for (let i = 0; i < shiftIdArray.length; i += batchSize) {
          const batch = shiftIdArray.slice(i, i + batchSize);
          const { data: batchData, error: batchError } = await supabase
            .from('shifts')
            .select('*')
            .in('id', batch);
            
          if (batchError) {
            console.error(`Error fetching shifts batch ${i}:`, batchError);
            continue;
          }
          
          if (batchData) {
            shiftsData = [...shiftsData, ...batchData];
          }
        }
      }
      
      console.log('Fetched shifts data:', shiftsData.length);
      
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
      
      // Remove null values
      const filteredUserIds = Array.from(userIds).filter(Boolean);
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
      
      console.log('Number of matched requests before processing:', matchedRequests?.length || 0);
      console.log('Number of completed requests before processing:', completedRequests?.length || 0);
      
      // Process matched swaps
      const formattedActiveMatches = processSwapRequests(
        matchedRequests || [], 
        shiftsData, 
        userId, 
        profilesMap
      );
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(
        completedRequests || [], 
        shiftsData, 
        userId, 
        profilesMap
      );
      
      // Log the processed matches
      console.log(`Processed ${formattedActiveMatches.length} active matches`);
      console.log(`Processed ${formattedCompletedMatches.length} completed matches`);
      
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
