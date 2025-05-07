
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/integrations/supabase/client';

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
  }, [user]);

  return {
    findSwapMatches,
    isProcessing,
    isFindingMatches,
    initialFetchCompleted
  };
};
