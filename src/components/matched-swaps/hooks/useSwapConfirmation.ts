
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}

export interface FinalizeDialogState {
  isOpen: boolean;
  matchId: string | null;
}

/**
 * Hook for handling swap confirmation dialog and actions
 */
export const useSwapConfirmation = (onSuccess?: () => void) => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    matchId: null
  });
  
  const [finalizeDialog, setFinalizeDialog] = useState<FinalizeDialogState>({
    isOpen: false,
    matchId: null
  });
  
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Accept a swap match
   */
  const acceptMatch = async (matchId: string) => {
    if (!matchId) return false;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Accepted",
        description: "You have successfully accepted the swap. Roster approval is now required.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Finalize a swap match
   */
  const finalizeMatch = async (matchId: string) => {
    if (!matchId) return false;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Finalized",
        description: "The shift swap has been finalized and both calendars have been updated.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (error) {
      console.error('Error finalizing swap:', error);
      toast({
        title: "Failed to finalize swap",
        description: "There was a problem finalizing the swap. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle accept button click
   */
  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  };

  /**
   * Handle finalize button click
   */
  const handleFinalizeClick = (matchId: string) => {
    setFinalizeDialog({ isOpen: true, matchId });
  };

  /**
   * Handle confirm accept in dialog
   */
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId) return;
    
    const success = await acceptMatch(confirmDialog.matchId);
    
    setConfirmDialog({ isOpen: false, matchId: null });
    
    return success;
  };

  /**
   * Handle confirm finalize in dialog
   */
  const handleFinalizeSwap = async () => {
    if (!finalizeDialog.matchId) return;
    
    const success = await finalizeMatch(finalizeDialog.matchId);
    
    setFinalizeDialog({ isOpen: false, matchId: null });
    
    return success;
  };

  return {
    confirmDialog,
    setConfirmDialog,
    finalizeDialog,
    setFinalizeDialog,
    isLoading,
    handleAcceptClick,
    handleFinalizeClick,
    handleAcceptSwap,
    handleFinalizeSwap
  };
};
