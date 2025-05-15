
import { findSwapMatches } from './findSwapMatches';
import { useProcessingState } from './useProcessingState';
import { useState } from 'react';

/**
 * Main hook for swap matching operations
 */
export const useSwapMatcher = () => {
  const [matchResults, setMatchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);
  const { isProcessing, setIsProcessing } = useProcessingState();
  
  return {
    findSwapMatches,
    matchResults,
    isLoading,
    isProcessing,
    initialFetchCompleted
  };
};
