
import { useState, useRef, useCallback } from 'react';
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
  // Track if a request is in progress
  const requestInProgressRef = useRef<boolean>(false);

  /**
   * Find potential matches for swap requests with caching and throttling
   */
  const findSwapMatches = useCallback(async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false
  ) => {
    try {
      // Skip if already processing or if there's a request in progress
      if (requestInProgressRef.current) {
        console.log('Request already in progress, skipping duplicate call');
        return [];
      }

      requestInProgressRef.current = true;
      
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
        
        // Still return cached data but set a flag to update cache in background
        setTimeout(() => {
          const refreshCacheKey = `${userId}:refresh-cache`;
          if (!cachedResultsRef.current.has(refreshCacheKey)) {
            cachedResultsRef.current.set(refreshCacheKey, { data: true, timestamp: now });
            // Refresh cache after returning response
            fetchFreshData(userId, forceCheck, verbose).catch(console.error);
          }
        }, 100);
        
        return cachedResult.data;
      }
      
      // Throttle requests to prevent excessive API calls
      const timeSinceLastRequest = now - requestTimestampRef.current;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS && requestTimestampRef.current !== 0) {
        console.log(`Throttling request - last request was ${timeSinceLastRequest}ms ago`);
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest));
      }
      
      return await fetchFreshData(userId, forceCheck, verbose);
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      if (setIsProcessing) {
        setIsProcessing(false);
      }
      
      // Reset request in progress after a short delay
      setTimeout(() => {
        requestInProgressRef.current = false;
      }, 500);
    }
  }, []);
  
  // Extract actual data fetching into a separate function for better code organization
  const fetchFreshData = async (userId: string, forceCheck: boolean, verbose: boolean) => {
    try {
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
      const cacheKey = `${userId}:${forceCheck}`;
      cachedResultsRef.current.set(cacheKey, { 
        data: data?.matches || [], 
        timestamp: Date.now() 
      });
      
      console.log('Found matches:', data);
      setMatchResults(data?.matches || []);
      return data?.matches || [];
    } catch (error) {
      console.error('Error in fetchFreshData:', error);
      throw error;
    }
  };

  return {
    findSwapMatches,
    matchResults
  };
};
