
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useProcessingState } from './useProcessingState';
import { useFindSwapMatches } from './useFindSwapMatches';
import { supabase } from '@/integrations/supabase/client';

export interface SwapMatcherOptions {
  includeRegionalMatches?: boolean;
  startDate?: string;
  endDate?: string;
}

export function useSwapMatcher() {
  const [options, setOptions] = useState<SwapMatcherOptions>({
    includeRegionalMatches: true,
  });
  
  const { state, setState, setComplete, setError, resetState } = useProcessingState();
  
  const {
    findMatches,
    isLoading: isMatchingInProgress,
    results
  } = useFindSwapMatches({
    onComplete: (matches) => {
      setComplete({
        matchedCount: matches.length,
        savedCount: matches.length,
      });
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: 'Error finding matches',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFindMatches = async () => {
    resetState();
    setState({ status: 'processing', step: 'fetching' });
    
    try {
      // Fetch all regions if we're doing regional matches
      let regionsData = [];
      if (options.includeRegionalMatches) {
        const { data: regions, error: regionsError } = await supabase
          .from('regions')
          .select('id, name')
          .eq('status', 'active');
          
        if (regionsError) {
          throw new Error(`Failed to fetch regions: ${regionsError.message}`);
        }
        
        regionsData = regions || [];
      }
      
      setState({ status: 'processing', step: 'matching' });
      
      // Execute the matching process
      await findMatches({
        includeRegionalMatches: options.includeRegionalMatches,
        regions: regionsData,
        startDate: options.startDate,
        endDate: options.endDate,
      });
      
      toast({
        title: 'Matching Complete',
        description: `Found ${results.matches?.length || 0} potential matches.`,
      });
      
    } catch (error) {
      setState({ 
        status: 'error', 
        error: error.message || 'Unknown error occurred'
      });
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to process matches',
        variant: 'destructive',
      });
    }
  };

  return {
    options,
    setOptions,
    state,
    findMatches: handleFindMatches,
    isLoading: isMatchingInProgress,
    results,
  };
}
