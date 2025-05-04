
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { findSimpleMatches } from '@/utils/swap-matching/simpleMatch';

/**
 * A simplified hook for finding swap matches using direct matching logic
 */
export const useSimpleMatcher = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * Find potential matches for a user's swap requests using simple match algorithm
   * @param forceCheck - Force checking for matches even if already matched
   */
  const findSwapMatches = async (forceCheck: boolean = false) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log(`Starting simple swap matching for user: ${user.id}`);
      
      const result = await findSimpleMatches(user.id);
      
      if (!result.success) {
        console.error("Error finding matches:", result.error);
        toast({
          title: "Failed to find matches",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
        return null;
      }
      
      console.log("Simple matching result:", result);
      
      // Show a toast with the results
      if (result.newMatches && result.newMatches > 0) {
        toast({
          title: "New matches found!",
          description: `Found ${result.newMatches} new potential swap matches.`,
        });
      } else if (result.totalMatches && result.totalMatches > 0) {
        toast({
          title: "Matches found",
          description: `You have ${result.totalMatches} potential swap matches.`,
        });
      } else {
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
      }
      
      return result.matches;
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      toast({
        title: "Failed to find matches",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
