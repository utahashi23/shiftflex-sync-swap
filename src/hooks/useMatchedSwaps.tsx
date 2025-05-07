
import { useState, useEffect } from 'react';
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

  // Debug logging for matches visibility
  useEffect(() => {
    if (matches && matches.length > 0) {
      console.log(`useMatchedSwaps: Found ${matches.length} matches with statuses:`, 
        matches.map(m => ({ id: m.id, status: m.status })));
      
      // Log specific statuses for debugging
      const acceptedMatches = matches.filter(m => m.status === 'accepted');
      const otherAcceptedMatches = matches.filter(m => m.status === 'other_accepted');
      
      console.log(`useMatchedSwaps: Found ${acceptedMatches.length} 'accepted' matches`);
      console.log(`useMatchedSwaps: Found ${otherAcceptedMatches.length} 'other_accepted' matches`);
    }
  }, [matches]);
  
  const refreshMatches = async () => {
    if (!user) return;
    // Important: Set userInitiatorOnly to false to get all matches including other_accepted ones
    await fetchMatches(true, false); 
  };
  
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId || !user) return;
    
    // Check if this match has been accepted by someone else
    const matchToAccept = matches.find(match => match.id === confirmDialog.matchId);
    if (matchToAccept && matchToAccept.status === 'other_accepted') {
      toast({
        title: "Cannot Accept Swap",
        description: "This swap has already been accepted by another user.",
        variant: "destructive"
      });
      setConfirmDialog({ isOpen: false, matchId: null });
      return;
    }
    
    const success = await acceptMatch(confirmDialog.matchId);
    
    if (success) {
      toast({
        title: "Swap Accepted",
        description: "You have successfully accepted the swap.",
      });
      
      // After accepting, refresh to get updated statuses
      await refreshMatches();
    }
    
    setConfirmDialog({ isOpen: false, matchId: null });
  };
  
  const handleMarkComplete = async (matchId: string) => {
    if (!matchId || !user) return;
    
    await completeMatch(matchId);
    
    // After completing, refresh to get updated statuses
    await refreshMatches();
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
