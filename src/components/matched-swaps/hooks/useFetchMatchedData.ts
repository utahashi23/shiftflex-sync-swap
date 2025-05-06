
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapMatch } from '../types';
import { getShiftType } from '@/utils/shiftUtils';

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
      
      // Call the get_user_matches function
      const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
        body: { user_id: userId }
      });
        
      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        throw matchesError;
      }
      
      console.log('Raw matches data:', matchesData);
      
      if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
        console.log('No matches found');
        return { matchedSwaps: [], completedSwaps: [] };
      }
      
      // Get unique matches only
      const uniqueMatchIds = new Set();
      const uniqueMatches = matchesData.filter((match: any) => {
        if (uniqueMatchIds.has(match.match_id)) {
          return false;
        }
        uniqueMatchIds.add(match.match_id);
        return true;
      });
      
      // Process and format the matches data
      const formattedMatches = (uniqueMatches as any[]).map(match => {
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
            colleagueType: match.my_shift_colleague_type || null
          },
          otherShift: {
            id: match.other_shift_id,
            date: match.other_shift_date,
            startTime: match.other_shift_start_time,
            endTime: match.other_shift_end_time,
            truckName: match.other_shift_truck,
            type: getShiftType(match.other_shift_start_time),
            userId: match.other_user_id,
            userName: match.other_user_id, // We'll update this with profile data
            employeeId: null, // We'll update this with profile data
            colleagueType: match.other_shift_colleague_type || null
          },
          myRequestId: match.my_request_id,
          otherRequestId: match.other_request_id,
          createdAt: new Date(match.created_at).toISOString()
        };
      });
      
      // Get user IDs involved in swaps for profile info
      const userIds = new Set<string>();
      formattedMatches.forEach(match => {
        if (match.otherShift.userId) userIds.add(match.otherShift.userId);
      });
      
      // Remove null values
      const filteredUserIds = Array.from(userIds).filter(Boolean);
      console.log('Fetching profiles for user IDs:', filteredUserIds);
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id')
        .in('id', filteredUserIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      // Create profiles map for quick lookup
      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
      
      // Update matches with user names and employee IDs
      formattedMatches.forEach(match => {
        const userId = match.otherShift.userId;
        if (userId && profilesMap[userId]) {
          const profile = profilesMap[userId];
          match.otherShift.userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User';
          match.otherShift.employeeId = profile.employee_id || null;
        } else {
          match.otherShift.userName = 'Unknown User';
          match.otherShift.employeeId = null;
        }
      });
      
      // Separate active and past matches
      // IMPORTANT: Include 'other_accepted' status in active matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted' || match.status === 'other_accepted'
      );
      
      const pastMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${pastMatches.length} past matches`);
      console.log(`Active matches - pending: ${activeMatches.filter(m => m.status === 'pending').length}, accepted: ${activeMatches.filter(m => m.status === 'accepted').length}, other_accepted: ${activeMatches.filter(m => m.status === 'other_accepted').length}`);
      
      return {
        matchedSwaps: activeMatches,
        completedSwaps: pastMatches
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
