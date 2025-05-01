
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MatchedSwap } from './types';
import { useFetchMatchedData } from './hooks/useFetchMatchedData';
import { useSwapActions } from './hooks/useSwapActions';
import { useSwapDialogs } from './hooks/useSwapDialogs';

export const useMatchedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<MatchedSwap[]>([]);
  const [pastSwaps, setPastSwaps] = useState<MatchedSwap[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  
  const { user } = useAuth();
  const { fetchMatchedSwaps, isLoading, setIsLoading } = useFetchMatchedData();
  const { handleAcceptSwap: acceptSwap, isLoading: isAcceptLoading } = useSwapActions();
  const { confirmDialog, setConfirmDialog } = useSwapDialogs();

  // Combine loading states
  const isProcessing = isLoading || isAcceptLoading;

  useEffect(() => {
    if (user) {
      refreshMatches();
    }
  }, [user]);

  const refreshMatches = async () => {
    if (!user) return;
    
    console.log('Refreshing matched swaps');
    const { matchedSwaps, completedSwaps } = await fetchMatchedSwaps(user.id);
    setSwapRequests(matchedSwaps);
    setPastSwaps(completedSwaps);
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    setIsLoading(true);
    
    const success = await acceptSwap(confirmDialog.swapId, () => {});
    
    if (success) {
      // Update the UI
      const completedSwap = swapRequests.find(s => s.id === confirmDialog.swapId);
      if (completedSwap) {
        // Move from active to completed
        setSwapRequests(prev => prev.filter(s => s.id !== confirmDialog.swapId));
        setPastSwaps(prev => [
          ...prev, 
          { ...completedSwap, status: 'completed' }
        ]);
      }
    }
    
    setConfirmDialog({ isOpen: false, swapId: null });
    setIsLoading(false);
  };

  return {
    swapRequests,
    pastSwaps,
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    isLoading: isProcessing,
    handleAcceptSwap,
    refreshMatches
  };
};
