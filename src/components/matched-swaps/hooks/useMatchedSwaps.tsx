
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MatchedSwap } from '../types';
import { useFetchMatchedData } from './useFetchMatchedData';
import { useSwapActions } from './useSwapActions';
import { useSwapDialogs } from './useSwapDialogs';

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
    setIsLoading(true);
    
    try {
      const { matchedSwaps, completedSwaps } = await fetchMatchedSwaps(user.id);
      
      // Log the data for debugging
      console.log(`Got ${matchedSwaps.length} matched swaps and ${completedSwaps.length} completed swaps`);
      
      setSwapRequests(matchedSwaps);
      setPastSwaps(completedSwaps);
    } catch (error) {
      console.error('Error refreshing matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    setIsLoading(true);
    
    try {
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
    } catch (error) {
      console.error('Error accepting swap:', error);
    } finally {
      setConfirmDialog({ isOpen: false, swapId: null });
      setIsLoading(false);
    }
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
