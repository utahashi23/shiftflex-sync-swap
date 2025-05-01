
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MatchedSwap } from '../types';
import { processSwapRequests } from '../utils';

/**
 * Hook for fetching matched swaps data
 */
export const useFetchMatchedData = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Fetch all matched and completed swaps for a user
   */
  const fetchMatchedSwaps = async (userId: string) => {
    if (!userId) return { matchedSwaps: [], completedSwaps: [] };
    
    setIsLoading(true);
    
    try {
      console.log('Fetching matched swaps for user', userId);
      
      // Step 1: Fetch matched swap requests
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
      
      // Get all necessary shift IDs
      const allShiftIds: string[] = [];
      
      // Collect shift IDs from matched requests
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) allShiftIds.push(req.requester_shift_id);
        if (req.acceptor_shift_id) allShiftIds.push(req.acceptor_shift_id);
      });
      
      // Collect shift IDs from completed requests
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) allShiftIds.push(req.requester_shift_id);
        if (req.acceptor_shift_id) allShiftIds.push(req.acceptor_shift_id);
      });
      
      // Deduplicate shift IDs
      const uniqueShiftIds = Array.from(new Set(allShiftIds.filter(Boolean)));
      
      console.log(`Fetching data for ${uniqueShiftIds.length} unique shift IDs`);
      
      // Fetch shift data if we have IDs
      let shiftsData: any[] = [];
      if (uniqueShiftIds.length > 0) {
        // Direct fetch from shifts table with detailed logging
        const { data: shifts, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('id', uniqueShiftIds);
          
        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError);
          throw shiftsError;
        }
        
        shiftsData = shifts || [];
        console.log(`Successfully fetched ${shiftsData.length} shifts`);
        
        // Log details of each shift for debugging
        shiftsData.forEach(shift => {
          console.log(`Shift ID: ${shift.id}, Date: ${shift.date}, Time: ${shift.start_time}-${shift.end_time}`);
        });
      }
      
      // Get all user profiles involved
      const userIds = new Set<string>();
      
      // Collect user IDs from matched requests
      matchedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id && req.acceptor_id !== null) userIds.add(req.acceptor_id);
      });
      
      // Collect user IDs from completed requests
      completedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id && req.acceptor_id !== null) userIds.add(req.acceptor_id);
      });
      
      // Remove any null values
      const filteredUserIds = Array.from(userIds).filter(Boolean);
      
      console.log(`Fetching profiles for ${filteredUserIds.length} user IDs`);
      
      // Fetch user profiles
      let profilesData: any[] = [];
      if (filteredUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', filteredUserIds);
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        profilesData = profiles || [];
        console.log(`Successfully fetched ${profilesData.length} user profiles`);
      }
      
      // Create profiles map for quick lookup
      const profilesMap = profilesData.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Create shift map for quick lookup by ID
      const shiftMap = shiftsData.reduce((map, shift) => {
        map[shift.id] = shift;
        return map;
      }, {} as Record<string, any>);

      console.log('Generated shift map with keys:', Object.keys(shiftMap));
      
      // Process the matched requests with correct shift data
      const formattedActiveMatches = processSwapRequests(
        matchedRequests || [], 
        shiftMap, 
        userId, 
        profilesMap
      );
      
      // Process the completed requests with correct shift data
      const formattedCompletedMatches = processSwapRequests(
        completedRequests || [], 
        shiftMap, 
        userId, 
        profilesMap
      );
      
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
