import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SwapMatch } from '@/hooks/swap-matches/types';
import { useSwapMatches } from '@/hooks/swap-matches';
import { useFetchMatchedData } from '@/components/matched-swaps/hooks/useFetchMatchedData';
import { useSwapActions } from '@/components/matched-swaps/hooks/useSwapActions';
import { useSwapDialogs } from '@/components/matched-swaps/hooks/useSwapDialogs';

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
    
    // Enhanced filtering: Filter out "other_accepted" swaps if the user has an accepted swap
    // This ensures that once a user accepts a swap, they don't see other potential matches
    const hasAcceptedSwap = matchedSwaps.some(swap => swap.status === 'accepted');
    
    console.log(`User has accepted swap: ${hasAcceptedSwap}`);
    
    // If user already has an accepted swap, filter out the "other_accepted" swaps
    // Also filter out ANY other pending swaps that share the same ID as the accepted swap's myShift.id
    let filteredSwaps = matchedSwaps;
    
    if (hasAcceptedSwap) {
      // Get the accepted swap(s)
      const acceptedSwaps = matchedSwaps.filter(swap => swap.status === 'accepted');
      console.log(`Found ${acceptedSwaps.length} accepted swaps`);
      
      // Get the IDs of the shifts involved in accepted swaps
      const acceptedShiftIds = new Set(
        acceptedSwaps.flatMap(swap => [swap.myShift.id, swap.otherShift.id])
      );
      
      console.log(`Filtering out swaps involving shift IDs: ${Array.from(acceptedShiftIds).join(', ')}`);
      
      // Keep only accepted swaps and swaps not involving the same shifts
      filteredSwaps = matchedSwaps.filter(swap => 
        swap.status === 'accepted' || 
        (!acceptedShiftIds.has(swap.myShift.id) && !acceptedShiftIds.has(swap.otherShift.id))
      );
    }
    
    console.log(`After filtering: showing ${filteredSwaps.length} swaps (filtered out ${matchedSwaps.length - filteredSwaps.length} swaps)`);
    
    setSwapRequests(filteredSwaps);
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
