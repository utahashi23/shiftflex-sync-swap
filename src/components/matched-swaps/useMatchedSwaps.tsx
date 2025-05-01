
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MatchedSwap } from './types';
import { useFetchMatchedData } from './hooks/useFetchMatchedData';
import { useSwapActions } from './hooks/useSwapActions';
import { useSwapDialogs } from './hooks/useSwapDialogs';
import { toast } from '@/hooks/use-toast';

export const useMatchedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<MatchedSwap[]>([]);
  const [pastSwaps, setPastSwaps] = useState<MatchedSwap[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { user } = useAuth();
  const { fetchMatchedSwaps, isLoading, setIsLoading } = useFetchMatchedData();
  const { handleAcceptSwap: acceptSwap, isLoading: isAcceptLoading } = useSwapActions();
  const { confirmDialog, setConfirmDialog } = useSwapDialogs();

  // Combine loading states
  const isProcessing = isLoading || isAcceptLoading || isRefreshing;

  useEffect(() => {
    if (user) {
      refreshMatches();
    }
  }, [user]);

  const refreshMatches = async () => {
    if (!user) return;
    
    try {
      setIsRefreshing(true);
      console.log('Refreshing matched swaps');
      
      const { matchedSwaps, completedSwaps } = await fetchMatchedSwaps(user.id);
      
      console.log(`Refreshed data: ${matchedSwaps.length} matched swaps and ${completedSwaps.length} completed swaps`);
      
      // Update state with the fetched data
      setSwapRequests(matchedSwaps);
      setPastSwaps(completedSwaps);
    } catch (error) {
      console.error('Error refreshing matches:', error);
      toast({
        title: "Error refreshing matches",
        description: "There was a problem refreshing your matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    try {
      setIsLoading(true);
      
      const success = await acceptSwap(confirmDialog.swapId, refreshMatches);
      
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
          
          toast({
            title: "Swap Accepted",
            description: "You have successfully accepted the swap.",
          });
        }
      }
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Error accepting swap",
        description: "Failed to accept the swap. Please try again.",
        variant: "destructive"
      });
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
