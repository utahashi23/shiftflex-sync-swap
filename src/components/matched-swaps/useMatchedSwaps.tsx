
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SwapMatch } from '@/hooks/swap-matches/types';
import { useFetchMatchedData } from '@/components/matched-swaps/hooks/useFetchMatchedData';
import { useSwapActions } from '@/components/matched-swaps/hooks/useSwapActions';
import { useSwapDialogs } from '@/components/matched-swaps/hooks/useSwapDialogs';
import { toast } from '@/hooks/use-toast';

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
    
    const matchToAccept = swapRequests.find(s => s.id === confirmDialog.matchId);
    
    // Check if this match has been accepted by another user first
    if (matchToAccept && matchToAccept.status === 'other_accepted') {
      toast({
        title: "Cannot Accept Swap",
        description: "This swap has already been accepted by another user.",
        variant: "destructive"
      });
      setConfirmDialog({ isOpen: false, matchId: null });
      setIsLoading(false);
      return;
    }
    
    const success = await acceptSwap(confirmDialog.matchId, () => {});
    
    if (success) {
      toast({
        title: "Swap Accepted",
        description: "You have accepted the swap. Waiting for the other user to accept.",
      });
      
      // Update the UI to reflect the accepted status
      await refreshMatches();
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
