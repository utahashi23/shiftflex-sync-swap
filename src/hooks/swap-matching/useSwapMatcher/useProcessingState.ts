
import { useState } from 'react';

/**
 * Hook to manage processing state for swap matching
 */
export const useProcessingState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  return { 
    isProcessing, 
    setIsProcessing 
  };
};
