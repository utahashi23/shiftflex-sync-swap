
import { useState } from 'react';

export interface ProcessingState {
  status: 'idle' | 'processing' | 'complete' | 'error';
  step?: string;
  error?: string;
  matchedCount?: number;
  savedCount?: number;
}

interface CompletionState {
  matchedCount: number;
  savedCount: number;
}

export function useProcessingState() {
  const [state, setState] = useState<ProcessingState>({ status: 'idle' });

  const setComplete = (completionState: CompletionState) => {
    setState({
      status: 'complete',
      ...completionState
    });
  };

  const setError = (error: string) => {
    setState({
      status: 'error',
      error
    });
  };

  const resetState = () => {
    setState({ status: 'idle' });
  };

  return {
    state,
    setState,
    setComplete,
    setError,
    resetState
  };
}
