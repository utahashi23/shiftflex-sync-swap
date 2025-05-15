
import { useState } from 'react';

export type ProcessingStage = 'idle' | 'fetchingData' | 'matching' | 'processingMatches' | 'complete' | 'error';

export interface ProcessingState {
  stage: ProcessingStage;
  message: string;
  progress: number; // 0-100
  details?: string;
}

export const useProcessState = () => {
  const initialState: ProcessingState = {
    stage: 'idle',
    message: 'Ready to start matching process',
    progress: 0
  };

  const [processingState, setProcessingState] = useState<ProcessingState>(initialState);

  const updateProcessingState = (updates: Partial<ProcessingState>) => {
    setProcessingState(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetProcessingState = () => {
    setProcessingState(initialState);
  };

  return {
    processingState,
    updateProcessingState,
    resetProcessingState
  };
};
