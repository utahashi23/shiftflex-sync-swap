
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
  
  // Fix: We'll access the refreshMatches function instead of fetchSwapRequests
  const { refreshMatches } = useSwapRequests();
  
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
      console.log('Calling accept_swap_match with match_id:', confirmDialog.matchId);
      
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { 
          match_id: confirmDialog.matchId
        }
      });
      
      if (error) {
        console.error('Error response from accept_swap_match:', error);
        throw error;
      }
      
      if (!data || data.error) {
        console.error('Error in accept_swap_match response:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'Failed to accept swap');
      }
      
      console.log('Success response from accept_swap_match:', data);
      
      toast({
        title: 'Swap accepted',
        description: 'The swap has been successfully accepted.'
      });
      
      // Refresh swap requests to reflect changes
      await refreshMatches();
      
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
  }, [confirmDialog.matchId, toast, onSuccess, refreshMatches]);
  
  // Finalize swap action
  const handleFinalizeSwap = useCallback(async () => {
    if (!finalizeDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Calling complete_swap_match with match_id:', finalizeDialog.matchId);
      
      const { data, error } = await supabase.functions.invoke('complete_swap_match', {
        body: { 
          match_id: finalizeDialog.matchId
        }
      });
      
      if (error) {
        console.error('Error response from complete_swap_match:', error);
        throw error;
      }
      
      if (!data || data.error) {
        console.error('Error in complete_swap_match response:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'Failed to finalize swap');
      }
      
      toast({
        title: 'Swap finalized',
        description: 'The swap has been successfully completed.'
      });
      
      // Refresh swap requests to reflect changes
      await refreshMatches();
      
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
  }, [finalizeDialog.matchId, toast, onSuccess, refreshMatches]);
  
  // Cancel swap action
  const handleCancelSwap = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Calling cancel_swap_match with match_id:', matchId);
      
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { 
          match_id: matchId
        }
      });
      
      if (error) {
        console.error('Error response from cancel_swap_match:', error);
        throw error;
      }
      
      if (!data || data.error) {
        console.error('Error in cancel_swap_match response:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'Failed to cancel swap');
      }
      
      toast({
        title: 'Swap canceled',
        description: 'The swap has been canceled.'
      });
      
      // Refresh swap requests to reflect changes
      await refreshMatches();
      
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
  }, [toast, onSuccess, refreshMatches]);
  
  // Resend email action
  const handleResendEmail = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Calling resend_swap_notification with match_id:', matchId);
      
      const { data, error } = await supabase.functions.invoke('resend_swap_notification', {
        body: { 
          match_id: matchId
        }
      });
      
      if (error) {
        console.error('Error response from resend_swap_notification:', error);
        throw error;
      }
      
      if (!data || data.error) {
        console.error('Error in resend_swap_notification response:', data?.error || 'Unknown error');
        throw new Error(data?.error || 'Failed to resend email');
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
