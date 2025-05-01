
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
      
      // Use our new direct shift query approach for improved data access
      // Fetch matched swap requests with robust error handling
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
      
      // Get ALL relevant shift IDs for fetching using our new secure function
      const shiftIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Get shifts data for all IDs using our new function for each shift
      const shiftsData = [];
      for (const shiftId of shiftIds) {
        const { data: shiftData, error: shiftError } = await supabase
          .rpc('get_shift_by_id', { shift_id: shiftId });
          
        if (shiftError) {
          console.error(`Error fetching shift ${shiftId}:`, shiftError);
          continue;
        }
        
        if (shiftData && shiftData.length > 0) {
          shiftsData.push(shiftData[0]);
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
      
      console.log('Number of matched requests before processing:', matchedRequests?.length || 0);
      console.log('Number of completed requests before processing:', completedRequests?.length || 0);
      
      // Manually prepare data for better processing - adding embedded shift data
      const matchedRequestsWithShifts = (matchedRequests || []).map(request => {
        const requesterShift = shiftsData.find(s => s.id === request.requester_shift_id);
        const acceptorShift = shiftsData.find(s => s.id === request.acceptor_shift_id);
        
        return {
          ...request,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      const completedRequestsWithShifts = (completedRequests || []).map(request => {
        const requesterShift = shiftsData.find(s => s.id === request.requester_shift_id);
        const acceptorShift = shiftsData.find(s => s.id === request.acceptor_shift_id);
        
        return {
          ...request,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      // Process matches with our improved data structure
      const formattedActiveMatches = processSwapRequests(
        matchedRequestsWithShifts, 
        shiftsData, 
        userId, 
        profilesMap
      );
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(
        completedRequestsWithShifts, 
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
