
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSwapRequests } from '@/hooks/swap-requests';

export type ConfirmDialogState = {
  isOpen: boolean;
  matchId: string | null;
};

export type FinalizeDialogState = {
  isOpen: boolean;
  matchId: string | null;
};

/**
 * Hook for handling swap confirmation actions
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
  const { toast } = useToast();
  const { fetchSwapRequests } = useSwapRequests();
  
  // Handlers for dialog opening
  const handleAcceptClick = useCallback((matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  }, []);
  
  const handleFinalizeClick = useCallback((matchId: string) => {
    setFinalizeDialog({ isOpen: true, matchId });
  }, []);
  
  // Accept swap action
  const handleAcceptSwap = useCallback(async () => {
    if (!confirmDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { 
          match_id: confirmDialog.matchId,
          bypass_auth: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Swap accepted',
        description: 'The swap has been successfully accepted.'
      });
      
      // Refresh swap requests to reflect changes
      await fetchSwapRequests();
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Error accepting swap:', error);
      toast({
        title: 'Failed to accept swap',
        description: error.message || 'An error occurred while accepting the swap.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, matchId: null });
    }
  }, [confirmDialog.matchId, toast, onSuccess, fetchSwapRequests]);
  
  // Finalize swap action
  const handleFinalizeSwap = useCallback(async () => {
    if (!finalizeDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('complete_swap_match', {
        body: { 
          match_id: finalizeDialog.matchId,
          bypass_auth: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Swap finalized',
        description: 'The swap has been successfully completed.'
      });
      
      // Refresh swap requests to reflect changes
      await fetchSwapRequests();
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Error finalizing swap:', error);
      toast({
        title: 'Failed to finalize swap',
        description: error.message || 'An error occurred while finalizing the swap.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setFinalizeDialog({ isOpen: false, matchId: null });
    }
  }, [finalizeDialog.matchId, toast, onSuccess, fetchSwapRequests]);
  
  // Cancel swap action
  const handleCancelSwap = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { 
          match_id: matchId,
          bypass_auth: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Swap canceled',
        description: 'The swap has been canceled.'
      });
      
      // Refresh swap requests to reflect changes
      await fetchSwapRequests();
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Error canceling swap:', error);
      toast({
        title: 'Failed to cancel swap',
        description: error.message || 'An error occurred while canceling the swap.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, onSuccess, fetchSwapRequests]);
  
  // Resend email action
  const handleResendEmail = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('resend_swap_notification', {
        body: { 
          match_id: matchId,
          bypass_auth: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Email sent',
        description: 'The notification email has been resent.'
      });
      
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast({
        title: 'Failed to resend email',
        description: error.message || 'An error occurred while resending the email.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  return {
    confirmDialog,
    setConfirmDialog,
    finalizeDialog,
    setFinalizeDialog,
    isLoading,
    handleAcceptClick,
    handleFinalizeClick,
    handleAcceptSwap,
    handleFinalizeSwap,
    handleCancelSwap,
    handleResendEmail
  };
};
