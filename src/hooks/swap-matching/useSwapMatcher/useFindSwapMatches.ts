
import { toast } from '@/hooks/use-toast';
import { fetchAllData, findMatches, processMatches } from '../operations';

/**
 * Hook for finding swap matches
 */
export const useFindSwapMatches = (setIsProcessing: (value: boolean) => void) => {
  /**
   * Find potential matches for a user's swap requests
   * @param userId - The ID of the current user (optional for admins)
   * @param forceCheck - Force checking for matches even if already matched
   */
  const findSwapMatches = async (userId?: string, forceCheck: boolean = false) => {
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', userId || 'No user ID provided (admin mode)');
      console.log('Force check:', forceCheck);
      
      // Fetch all necessary data from the database
      const result = await fetchAllData();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      const { allRequests, allShifts, preferredDates, profilesMap } = result;
      
      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests in the system to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Log data to diagnose issues
      console.log(`Found ${allRequests.length} swap requests, ${allShifts.length} shifts, ${preferredDates.length} preferred dates`);
      console.log('Sample request:', allRequests[0]);
      console.log('Sample shift:', allShifts[0]);
      console.log('Sample preferred date:', preferredDates[0]);
      
      // Separate my requests from other users' requests if userId is provided
      const myRequests = userId 
        ? allRequests.filter(req => req.requester_id === userId)
        : allRequests;
        
      const otherUsersRequests = userId
        ? allRequests.filter(req => req.requester_id !== userId)
        : [];
      
      if (userId) {
        console.log('My requests:', myRequests.length);
        console.log('Other users requests:', otherUsersRequests.length);
      } else {
        console.log('Admin mode: processing all requests together');
      }
      
      if (userId && myRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "You don't have any pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      if (userId && otherUsersRequests.length === 0) {
        toast({
          title: "No potential matches",
          description: "No other users currently have pending swap requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Find potential matches - Pass userId to ensure it works for non-admin users
      // If forceCheck is true, this will check for matches regardless of existing matches
      const matches = findMatches(allRequests, allShifts, preferredDates, profilesMap, userId, forceCheck);
      console.log('Found potential matches:', matches);
      
      // Process matches
      if (matches.length === 0) {
        toast({
          title: "No new matches found",
          description: "We couldn't find any matching swaps right now. Try again later or adjust your preferences.",
        });
      } else {
        // Process the matches and handle the case of already existing matches
        const matchResults = await processMatches(matches, userId);
        
        console.log('Match results:', matchResults);
        
        const newMatches = matchResults.filter(result => !result.alreadyExists).length;
        
        if (newMatches > 0) {
          toast({
            title: "Matches Found!",
            description: `Found ${newMatches} potential swap match${newMatches !== 1 ? 'es' : ''}.`,
          });
        } else if (matchResults.length > 0) {
          toast({
            title: "Matches Already Exist",
            description: "All potential matches have already been recorded.",
          });
        }
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

  return {
    findSwapMatches
  };
};
