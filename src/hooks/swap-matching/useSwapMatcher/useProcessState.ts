import { useState } from 'react';

export type ProcessStatus =
  | 'idle'
  | 'fetching-data'
  | 'analyzing-data'
  | 'finding-matches'
  | 'storing-matches'
  | 'complete'
  | 'error';

export const useProcessState = () => {
  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  
  const startProcessing = (initialStatus: ProcessStatus = 'fetching-data') => {
    setStatus(initialStatus);
    setProgress(0);
    setMessage(`Starting ${initialStatus} process`);
  };
  
  const updateProgress = (newStatus: ProcessStatus, statusMessage: string, progressValue?: number) => {
    setStatus(newStatus);
    setMessage(statusMessage);
    
    if (progressValue !== undefined) {
      setProgress(progressValue);
    } else {
      // Auto calculate progress based on status
      switch (newStatus) {
        case 'fetching-data':
          setProgress(20);
          break;
        case 'analyzing-data':
          setProgress(40);
          break;
        case 'finding-matches':
          setProgress(60);
          break;
        case 'storing-matches':
          setProgress(80);
          break;
        case 'complete':
          setProgress(100);
          break;
        case 'error':
          // Keep current progress
          break;
        default:
          setProgress(0);
      }
    }
  };
  
  const setError = (errorMessage: string) => {
    setStatus('error');
    setMessage(errorMessage);
  };
  
  return {
    status,
    progress,
    message,
    startProcessing,
    updateProgress,
    setError
  };
};
