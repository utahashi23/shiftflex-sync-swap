
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessingState } from './useProcessingState';

/**
 * Hook for finding and processing swap matches
 */
export const useSwapMatcher = () => {
  const { user } = useAuth();
  const { isProcessing, setIsProcessing } = useProcessingState();
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const { findSwapMatches: executeFindMatches } = useFindSwapMatches(setIsProcessing);
  
  /**
   * Find potential matches for a user's swap requests
   * @param userId - The ID of the current user (optional for admins)
   * @param forceCheck - Force checking for matches even if already matched
   * @param verbose - Whether to enable verbose logging
   * @param specificCheck - Whether to check for specific users mentioned in issues
   */
  const findSwapMatches = async (
    userId?: string, 
    forceCheck: boolean = false, 
    verbose: boolean = true, // Default to true for more debugging info
    specificCheck: boolean = false
  ) => {
    if (!user && !userId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsFindingMatches(true);
      console.log(`Finding swap matches for user: ${userId || user?.id}, force check: ${forceCheck}, verbose: ${verbose}`);
      
      // Log known problem IDs (from user message)
      const knownUserIds = ['0dba6413-6ab5-46c9-9db1-ecca3b444e34', 'b6da71dc-3749-4b92-849a-1977ff196e67'];
      const knownRequestIds = ['b70b145b-965f-462c-b8c0-366865dc7f02', '3ecb141f-5b7e-4cb2-bd83-532345876ed6'];
      
      if (knownUserIds.includes(userId || user?.id)) {
        console.log("Processing known problematic user, enabling specific checks");
        specificCheck = true;
      }
      
      // Only perform direct call if verbose is enabled
      if (verbose) {
        try {
          console.log("Testing direct call to edge function...");
          const result = await executeFindMatches(userId || user?.id, forceCheck, verbose, specificCheck);
          console.log("Direct edge function result:", result);
        } catch (error) {
          console.error("Error in direct edge function call:", error);
        }
      }
      
      // Normal execution
      await executeFindMatches(userId || user?.id, forceCheck, verbose, specificCheck);
      
      // When debugging known issues, provide feedback
      if (specificCheck || knownUserIds.includes(userId || user?.id)) {
        toast({
          title: "Debug mode active",
          description: "Checking specific users and requests with enhanced logging.",
        });
      }
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      toast({
        title: "Failed to find matches",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFindingMatches(false);
    }
  };

  return {
    findSwapMatches,
    isProcessing,
    isFindingMatches
  };
};
