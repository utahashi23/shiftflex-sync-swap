
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/integrations/supabase/client';
import { useSwapRequests } from '@/hooks/swap-requests';

/**
 * Hook for finding and processing swap matches correctly,
 * bypassing RLS recursion issues with direct edge function calls
 */
export const useSwapMatcher = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [matchesCache, setMatchesCache] = useState<Record<string, any[]>>({});
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);
  const { swapRequests, fetchSwapRequests } = useSwapRequests();
  
  /**
   * Find potential matches by calling the edge function directly
   * to avoid RLS recursion issues
   */
  const findSwapMatches = useCallback(async (
    userId?: string, 
    forceCheck: boolean = false, 
    verbose: boolean = false
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
    
    try {
      // First ensure we have the latest swap requests
      await fetchSwapRequests();
      
      // Check if user has any active requests
      const activeRequests = swapRequests.filter(req => 
        req.status === 'pending' || req.status === 'matched'
      );
      
      if (activeRequests.length === 0) {
        console.log('User has no active swap requests, skipping match search');
        return [];
      }
      
      setIsFindingMatches(true);
      setIsProcessing(true);
      
      console.log(`Finding swap matches for user: ${targetUserId}, force check: ${forceCheck}`);
      
      // Make direct call to the edge function to avoid RLS recursion
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: { 
          user_id: targetUserId,
          force_check: forceCheck,
          verbose: verbose,
          user_perspective_only: true,
          user_initiator_only: true,
          include_colleague_types: true, // Explicitly request colleague types
          has_active_requests: true, // Only return matches for users with active requests
          bypass_rls: true // Explicitly request RLS bypass
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        throw error;
      }
      
      // Cache the results if we have valid data
      if (data && Array.isArray(data)) {
        setMatchesCache(prev => ({
          ...prev,
          [targetUserId]: data
        }));
        
        // Mark initial fetch as completed
        setInitialFetchCompleted(true);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      toast({
        title: "Failed to find matches",
        description: "An unexpected error occurred while finding matches.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsFindingMatches(false);
      setIsProcessing(false);
    }
  }, [user, swapRequests, fetchSwapRequests]);

  return {
    findSwapMatches,
    isProcessing,
    isFindingMatches,
    initialFetchCompleted
  };
};
