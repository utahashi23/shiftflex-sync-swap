
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { checkSwapCompatibility, fetchSwapMatchingData, recordShiftMatch } from '@/utils/swap-matching';

/**
 * Hook for finding and processing swap matches
 */
export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Find potential matches for a user's swap requests
   */
  const findSwapMatches = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', user.id);
      
      // Fetch all necessary data from the database
      const { data, error } = await fetchSwapMatchingData();
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.allRequests || data.allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests in the system to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      const { allRequests, allShifts, preferredDates } = data;
      
      // Separate my requests from other users' requests
      const myRequests = allRequests.filter(req => req.requester_id === user.id);
      const otherUsersRequests = allRequests.filter(req => req.requester_id !== user.id);
      
      console.log('My requests:', myRequests.length);
      console.log('Other users requests:', otherUsersRequests.length);
      
      if (myRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "You don't have any pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      if (otherUsersRequests.length === 0) {
        toast({
          title: "No potential matches",
          description: "No other users currently have pending swap requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Process matches
      const matchResults = await processMatches(myRequests, otherUsersRequests, allShifts, preferredDates, user.id);
      
      if (!matchResults.matchesFound) {
        toast({
          title: "No matches found",
          description: "We couldn't find any matching swaps right now. Try again later or adjust your preferences.",
        });
      }
      
      console.log('----------- SWAP MATCHING COMPLETED -----------');
      
    } catch (error) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error finding matches",
        description: "There was a problem finding swap matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Process matches between requests
   */
  const processMatches = async (
    myRequests: any[], 
    otherUsersRequests: any[], 
    allShifts: any[], 
    preferredDates: any[],
    userId: string
  ) => {
    // Create lookup maps for more efficient matching
    const shiftMap = new Map();
    allShifts.forEach(shift => {
      shiftMap.set(shift.id, {
        ...shift,
        normalizedDate: new Date(shift.date).toISOString().split('T')[0],
        type: getShiftType(shift.start_time)
      });
    });
    
    // Create lookup for user shifts by date to avoid conflicts
    const shiftsByUser: Record<string, string[]> = {};
    allShifts.forEach(shift => {
      const normalizedDate = new Date(shift.date).toISOString().split('T')[0];
      if (!shiftsByUser[shift.user_id]) {
        shiftsByUser[shift.user_id] = [];
      }
      shiftsByUser[shift.user_id].push(normalizedDate);
    });
    
    // Create lookup for preferred dates by request
    const preferredDatesByRequest: Record<string, any[]> = {};
    preferredDates.forEach(pref => {
      if (!preferredDatesByRequest[pref.request_id]) {
        preferredDatesByRequest[pref.request_id] = [];
      }
      preferredDatesByRequest[pref.request_id].push(pref);
    });
    
    // Process each of my requests against other users' requests
    let matchesFound = false;
    
    for (const myRequest of myRequests) {
      const myShiftData = shiftMap.get(myRequest.requester_shift_id);
      if (!myShiftData) {
        console.log(`Could not find shift data for my request ${myRequest.id}`);
        continue;
      }
      
      // Check each other user's request for potential matches
      for (const otherRequest of otherUsersRequests) {
        const otherShiftData = shiftMap.get(otherRequest.requester_shift_id);
        if (!otherShiftData) {
          console.log(`Could not find shift data for other request ${otherRequest.id}`);
          continue;
        }
        
        // Check if users want to swap shifts based on their preferences
        const { isCompatible } = checkSwapCompatibility(
          myRequest,
          otherRequest,
          myShiftData,
          otherShiftData,
          preferredDatesByRequest,
          shiftsByUser
        );
        
        // If match found, record it
        if (isCompatible) {
          const recordResult = await recordShiftMatch(myRequest, otherRequest, userId);
          
          if (recordResult.success) {
            matchesFound = true;
            toast({
              title: "Match Found!",
              description: `Your shift on ${new Date(myShiftData.date).toLocaleDateString()} has been matched with a swap.`,
            });
            break;
          }
        }
      }
      
      if (matchesFound) break;
    }
    
    return { matchesFound };
  };

  // Helper function to determine shift type based on start time
  const getShiftType = (startTime: string): "day" | "afternoon" | "night" => {
    const startHour = new Date(`2000-01-01T${startTime}`).getHours();
    
    if (startHour <= 8) {
      return 'day';
    } else if (startHour > 8 && startHour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
