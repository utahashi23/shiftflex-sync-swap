
import { useState } from 'react';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessState } from './useProcessState';
import { fetchAllData } from '../operations/fetchAllData';
import { processMatches } from '../operations/processMatches';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the hooks
  const { findSwapMatches } = useFindSwapMatches();
  const { processingState, updateProcessingState, resetProcessingState } = useProcessState();
  
  // Main function to run the matching process
  const runMatchingProcess = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    resetProcessingState();
    
    try {
      // Update state to show we're fetching data
      updateProcessingState({ 
        stage: 'fetchingData', 
        message: 'Fetching all swaps data...',
        progress: 5
      });
      
      // Fetch all necessary data
      const data = await fetchAllData();
      
      if (!data.success) {
        // Handle failure case
        throw new Error(data.message || 'Failed to fetch data');
      }
      
      // Update state to show we're now matching
      updateProcessingState({ 
        stage: 'matching', 
        message: 'Finding potential matches...',
        progress: 30 
      });
      
      // Find all possible matches - pass the data object with its properties
      const matches = await findSwapMatches(data);
      
      // Update state to show we're processing matches
      updateProcessingState({ 
        stage: 'processingMatches', 
        message: 'Processing matches...',
        progress: 70 
      });
      
      // Process the found matches
      await processMatches(matches);
      
      // Done!
      updateProcessingState({ 
        stage: 'complete', 
        message: 'Matching process complete!',
        progress: 100 
      });
      
    } catch (err) {
      console.error('Error in matching process:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Update state to show error
      updateProcessingState({ 
        stage: 'error', 
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        progress: 0 
      });
      
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    runMatchingProcess,
    isProcessing,
    error,
    processingState
  };
};
