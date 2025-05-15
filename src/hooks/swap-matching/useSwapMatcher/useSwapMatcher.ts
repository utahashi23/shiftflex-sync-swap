
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
    findSwapMatches,
    isLoading: isMatchingInProgress,
    matchResults
  } = useFindSwapMatches();

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
      
      // Get the user ID first, then pass it to findSwapMatches
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || '';
      
      // Execute the matching process
      const result = await findSwapMatches(
        userId,
        options.includeRegionalMatches,
        true
      );
      
      if (result.success) {
        setComplete({
          matchedCount: Array.isArray(result.matches) ? result.matches.length : 0,
          savedCount: Array.isArray(result.matches) ? result.matches.length : 0,
        });
        
        toast({
          title: 'Matching Complete',
          description: `Found ${Array.isArray(result.matches) ? result.matches.length : 0} potential matches.`,
        });
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
    } catch (error: any) {
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
    results: matchResults,
  };
}
