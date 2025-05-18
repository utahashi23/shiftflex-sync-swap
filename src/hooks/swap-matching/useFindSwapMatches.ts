
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced hook to find swap matches with throttling and caching
 */
export const useFindSwapMatches = (setIsProcessing?: (isProcessing: boolean) => void) => {
  const [matchResults, setMatchResults] = useState<any>(null);
  const requestTimestampRef = useRef<number>(0);
  const cachedResultsRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  
  // Define cache expiry time (5 minutes)
  const CACHE_EXPIRY_MS = 5 * 60 * 1000;
  // Define minimum time between requests (2 seconds)
  const MIN_REQUEST_INTERVAL_MS = 2000;

  /**
   * Find potential matches for swap requests with caching and throttling
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false
  ) => {
    try {
      // Skip if already processing
      if (setIsProcessing) {
        setIsProcessing(true);
      }
      
      // Create a cache key based on parameters
      const cacheKey = `${userId}:${forceCheck}`;
      
      // Check if we have a cached result that's still valid
      const cachedResult = cachedResultsRef.current.get(cacheKey);
      const now = Date.now();
      
      if (
        cachedResult && 
        now - cachedResult.timestamp < CACHE_EXPIRY_MS && 
        !forceCheck
      ) {
        console.log('Using cached matches data');
        setMatchResults(cachedResult.data);
        return cachedResult.data;
      }
      
      // Throttle requests to prevent excessive API calls
      const timeSinceLastRequest = now - requestTimestampRef.current;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS && requestTimestampRef.current !== 0) {
        console.log(`Throttling request - last request was ${timeSinceLastRequest}ms ago`);
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest));
      }
      
      // Update the request timestamp
      requestTimestampRef.current = Date.now();
      
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose})`);
      
      // Call the edge function which can bypass RLS and get a complete view
      const { data, error } = await supabase.functions.invoke('new_find_swap_matches', {
        body: { 
          user_id: userId,
          force_check: forceCheck,
          verbose: verbose,
          user_perspective_only: true,
          user_initiator_only: true,
          include_colleague_types: true
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        throw error;
      }
      
      // Store the result in cache
      cachedResultsRef.current.set(cacheKey, { 
        data: data?.matches || [], 
        timestamp: Date.now() 
      });
      
      console.log('Found matches:', data);
      setMatchResults(data?.matches || []);
      return data?.matches || [];
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      if (setIsProcessing) {
        setIsProcessing(false);
      }
    }
  };

  return {
    findSwapMatches,
    matchResults
  };
};
