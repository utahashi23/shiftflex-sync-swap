
import { useState } from 'react';

/**
 * Hook for managing the processing state
 * Note: This hook only manages basic processing state flags.
 * Additional state for stage, message, error, and matches
 * is managed in the parent useSwapMatcher hook.
 */
export const useProcessState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  return {
    isProcessing,
    setIsProcessing
  };
};
