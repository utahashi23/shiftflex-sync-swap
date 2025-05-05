
import { useState, useRef } from 'react';
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
  const [matchesCache, setMatchesCache] = useState<Record<string, any[]>>({});
  const { findSwapMatches: executeFindMatches } = useFindSwapMatches(setIsProcessing);
  const requestInProgressRef = useRef<boolean>(false);
  
  /**
   * Find potential matches for a user's swap requests
   * @param userId - The ID of the current user (optional for admins)
   * @param forceCheck - Force checking for matches even if already matched
   * @param verbose - Whether to enable verbose logging
   * @param userPerspectiveOnly - Whether to only show matches from the user's perspective
   * @param userInitiatorOnly - Whether to only show matches where the user is the initiator
   */
  const findSwapMatches = async (
    userId?: string, 
    forceCheck: boolean = false, 
    verbose: boolean = true,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = true
  ) => {
    if (!user && !userId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return [];
    }
    
    // Use the user ID that was passed in or fall back to the current user's ID
    const targetUserId = userId || user?.id;
    
    // Check if we have cached results and forceCheck is false
    if (!forceCheck && matchesCache[targetUserId]) {
      console.log(`Using cached matches for user ${targetUserId}`);
      return matchesCache[targetUserId];
    }
    
    // Prevent concurrent API calls
    if (isFindingMatches || requestInProgressRef.current) {
      console.log('Already finding matches, returning cached or empty results');
      return matchesCache[targetUserId] || [];
    }
    
    try {
      setIsFindingMatches(true);
      requestInProgressRef.current = true;
      
      console.log(`Finding swap matches for user: ${targetUserId}, force check: ${forceCheck}, verbose: ${verbose}, user perspective only: ${userPerspectiveOnly}, user initiator only: ${userInitiatorOnly}`);
      
      // Use service-role based approach to bypass RLS issues
      console.log("Using modified approach to avoid RLS recursion...");
      try {
        // Always force userInitiatorOnly to true to ensure consistent behavior
        const result = await executeFindMatches(
          targetUserId, 
          forceCheck, 
          verbose, 
          userPerspectiveOnly,
          true // Always use true for userInitiatorOnly
        );
        console.log("Edge function result:", result);
        
        // Cache the results if we have valid data
        if (result && Array.isArray(result)) {
          setMatchesCache(prev => ({
            ...prev,
            [targetUserId]: result
          }));
        }
        
        // Show a toast if matches were found and forceCheck is true
        if (forceCheck && result && Array.isArray(result)) {
          if (result.length > 0) {
            toast({
              title: "Matches found!",
              description: `Found ${result.length} potential swap matches.`,
            });
          } else {
            toast({
              title: "No matches found",
              description: "No potential swap matches were found at this time.",
            });
          }
        }
        
        return result;
      } catch (error) {
        console.error("Error in edge function call:", error);
        throw error;
      }
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      toast({
        title: "Failed to find matches",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsFindingMatches(false);
      requestInProgressRef.current = false;
    }
  };

  return {
    findSwapMatches,
    isProcessing,
    isFindingMatches
  };
};
