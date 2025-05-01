
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
      
      // Fetch matched swap requests with complete shift data included
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id,
          requester_shift:requester_shift_id(id, date, start_time, end_time, truck_name),
          acceptor_shift:acceptor_shift_id(id, date, start_time, end_time, truck_name)
        `)
        .eq('status', 'matched')
        .or(`requester_id.eq.${userId},acceptor_id.eq.${userId}`);
        
      if (matchedError) {
        console.error('Error fetching matched swaps:', matchedError);
        throw matchedError;
      }
      
      console.log('Active matched swaps:', matchedRequests);
      
      // Fetch completed swaps with complete shift data included
      const { data: completedRequests, error: completedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id,
          requester_shift:requester_shift_id(id, date, start_time, end_time, truck_name),
          acceptor_shift:acceptor_shift_id(id, date, start_time, end_time, truck_name)
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
      
      // Get ALL relevant shift IDs for fetching additional shift details
      const shiftIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id && !req.requester_shift) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id && !req.acceptor_shift) shiftIds.add(req.acceptor_shift_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_shift_id && !req.requester_shift) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id && !req.acceptor_shift) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Only fetch additional shifts if needed (some might be missing after join)
      let shiftsData: any[] = [];
      if (shiftIds.size > 0) {
        console.log('Fetching additional shift data for IDs:', Array.from(shiftIds));
        
        const { data: shifts, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('id', Array.from(shiftIds));
          
        if (shiftsError) {
          console.error('Error fetching additional shifts:', shiftsError);
          throw shiftsError;
        }
        
        console.log('Fetched additional shifts data:', shifts?.length || 0);
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
      
      console.log('Fetched profiles data:', profilesData?.length || 0);
      
      // Create profiles map for quick lookup
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Process matches to avoid duplicates - using our improved processSwapRequests function
      const formattedActiveMatches = processSwapRequests(
        matchedRequests || [], 
        shiftsData, 
        userId, 
        profilesMap
      );
      
      // Process completed matches - fix: use completedRequests instead of undefined variable
      const formattedCompletedMatches = processSwapRequests(
        completedRequests || [], 
        shiftsData, 
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
