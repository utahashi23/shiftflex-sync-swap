
import { useState } from 'react';

/**
 * Hook for managing the processing state
 */
export const useProcessingState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  return {
    isProcessing,
    setIsProcessing
  };
};
