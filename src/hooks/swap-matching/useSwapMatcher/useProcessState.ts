
import { useState } from 'react';
import { MatchingStatus } from './useSwapMatcher';

/**
 * Hook for managing the processing state and progress
 */
export const useProcessState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<MatchingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');
  
  const startProcessing = (newStatus: MatchingStatus) => {
    setIsProcessing(true);
    setStatus(newStatus);
    setProgress(0);
    setMessage(`Starting ${newStatus}`);
  };
  
  const updateProgress = (newStatus: MatchingStatus, newMessage: string, newProgress?: number) => {
    setStatus(newStatus);
    setMessage(newMessage);
    if (newProgress !== undefined) {
      setProgress(newProgress);
    } else {
      setProgress(prev => Math.min(prev + 20, 100));
    }
  };
  
  return {
    isProcessing,
    setIsProcessing,
    status,
    progress,
    message,
    startProcessing,
    updateProgress
  };
};
