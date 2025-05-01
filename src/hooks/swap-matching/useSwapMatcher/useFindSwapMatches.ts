
import { toast } from '@/hooks/use-toast';
import { fetchAllData, findMatches, processMatches } from '../operations';

/**
 * Hook for finding swap matches
 */
export const useFindSwapMatches = (setIsProcessing: (value: boolean) => void) => {
  /**
   * Find potential matches for a user's swap requests
   */
  const findSwapMatches = async (userId: string) => {
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', userId);
      
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
      
      // Separate my requests from other users' requests
      const myRequests = allRequests.filter(req => req.requester_id === userId);
      const otherUsersRequests = allRequests.filter(req => req.requester_id !== userId);
      
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
      
      // Find potential matches
      const matches = findMatches(allRequests, allShifts, preferredDates, profilesMap);
      
      // Process matches
      if (matches.length === 0) {
        toast({
          title: "No matches found",
          description: "We couldn't find any matching swaps right now. Try again later or adjust your preferences.",
        });
      } else {
        // Process the matches
        const matchesCount = await processMatches(matches, userId);
        
        if (matchesCount > 0) {
          toast({
            title: "Matches Found!",
            description: `Found ${matchesCount} potential swap matches.`,
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
