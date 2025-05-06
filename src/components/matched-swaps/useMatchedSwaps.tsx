import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SwapMatch } from '@/hooks/swap-matches/types';
import { useSwapMatches } from '@/hooks/swap-matches';
import { useFetchMatchedData } from './useFetchMatchedData';
import { useSwapActions } from './useSwapActions';
import { useSwapDialogs } from './useSwapDialogs';

export const useMatchedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<SwapMatch[]>([]);
  const [pastSwaps, setPastSwaps] = useState<SwapMatch[]>([]);
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
    
    // Log the data for debugging
    console.log(`Got ${matchedSwaps.length} matched swaps and ${completedSwaps.length} completed swaps`);
    
    setSwapRequests(matchedSwaps);
    setPastSwaps(completedSwaps);
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId || !user) return;
    
    setIsLoading(true);
    
    const success = await acceptSwap(confirmDialog.matchId, () => {});
    
    if (success) {
      // Update the UI
      const completedSwap = swapRequests.find(s => s.id === confirmDialog.matchId);
      if (completedSwap) {
        // Move from active to completed
        setSwapRequests(prev => prev.filter(s => s.id !== confirmDialog.matchId));
        setPastSwaps(prev => [
          ...prev, 
          { ...completedSwap, status: 'completed' }
        ]);
      }
    }
    
    setConfirmDialog({ isOpen: false, matchId: null });
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
