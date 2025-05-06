
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSwapMatches as useSwapMatchesHook, SwapMatch } from '@/hooks/useSwapMatches';
import { toast } from '@/hooks/use-toast';

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
  } = useSwapMatchesHook();
  
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
    matches,
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
