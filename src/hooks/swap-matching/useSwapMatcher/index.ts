
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessState } from './useProcessState';

export { useSwapMatcher };

function useSwapMatcher() {
  const { 
    status,
    progress, 
    message,
    startProcessing,
    updateProgress,
    setError
  } = useProcessState();
  
  const { 
    findSwapMatches, 
    isProcessing: isMatchProcessing, 
    matchResults 
  } = useFindSwapMatches();

  return {
    findSwapMatches,
    isProcessing: isMatchProcessing,
    status,
    progress,
    message,
    error: message,
    matchResults,
  };
}
