
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useSwapMatches } from './swap-matches';
import { SwapMatch } from './swap-matches/types';
import { toast } from './use-toast';

export type ConfirmDialogState = {
  isOpen: boolean;
  matchId: string | null;
};

export function useMatchedSwaps() {
  const [activeTab, setActiveTab] = useState('active');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    matchId: null
  });
  
  const { user } = useAuth();
  const { 
    matches,
    pastMatches,
    isLoading,
    fetchMatches,
    acceptMatch,
    completeMatch
  } = useSwapMatches();
  
  // Filter out other_accepted swaps if the user has an accepted swap
  const filteredMatches = useMemo(() => {
    const hasAcceptedSwap = matches?.some(swap => swap.status === 'accepted');
    
    if (hasAcceptedSwap && matches) {
      // Get the accepted swap(s)
      const acceptedSwaps = matches.filter(swap => swap.status === 'accepted');
      
      // Get the IDs of the shifts involved in accepted swaps
      const acceptedShiftIds = new Set(
        acceptedSwaps.flatMap(swap => [swap.myShift.id, swap.otherShift.id])
      );
      
      // Keep only accepted swaps and swaps not involving the same shifts
      return matches.filter(swap => 
        swap.status === 'accepted' || 
        (!acceptedShiftIds.has(swap.myShift.id) && !acceptedShiftIds.has(swap.otherShift.id))
      );
    }
    
    return matches;
  }, [matches]);
  
  const refreshMatches = async () => {
    if (!user) return;
    await fetchMatches();
  };
  
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId || !user) return;
    
    const success = await acceptMatch(confirmDialog.matchId);
    
    if (success) {
      toast({
        title: "Swap Accepted",
        description: "You have successfully accepted the swap.",
      });
    }
    
    setConfirmDialog({ isOpen: false, matchId: null });
  };
  
  const handleMarkComplete = async (matchId: string) => {
    if (!matchId || !user) return;
    
    await completeMatch(matchId);
  };
  
  return {
    matches: filteredMatches || [],
    pastMatches,
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    isLoading,
    handleAcceptSwap,
    handleMarkComplete,
    refreshMatches
  };
}
