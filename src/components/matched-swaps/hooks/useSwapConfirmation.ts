
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSwapDialogs } from './useSwapDialogs';
import { useEmailNotifications } from './useEmailNotifications';

/**
 * Hook for managing swap confirmation dialogs and actions
 */
export const useSwapConfirmation = (onSuccessCallback?: () => void) => {
  const { confirmDialog, setConfirmDialog, finalizeDialog, setFinalizeDialog } = useSwapDialogs();
  const emailNotifications = useEmailNotifications();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Trigger the accept confirmation dialog
   */
  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  };

  /**
   * Trigger the finalize dialog
   */
  const handleFinalizeClick = (matchId: string) => {
    setFinalizeDialog({ isOpen: true, matchId });
  };

  /**
   * Accept the swap and close the dialog
   */
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      // Call the accept_swap_match function
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: confirmDialog.matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
      
      // Send email notifications
      try {
        await emailNotifications.sendAcceptanceNotification(confirmDialog.matchId);
      } catch (emailError) {
        console.error('Error sending acceptance notification:', emailError);
        // Don't fail the entire operation if just the email fails
        toast({
          title: "Email Notification Issue",
          description: "The swap was accepted but there was a problem sending notifications.",
          variant: "warning"
        });
      }
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
      setConfirmDialog({ isOpen: false, matchId: null });
      
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Finalize the swap and close the dialog
   */
  const handleFinalizeSwap = async () => {
    if (!finalizeDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      // Call the finalize_swap_match function
      const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
        body: { match_id: finalizeDialog.matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Finalized",
        description: "The shift swap has been finalized and the calendar has been updated.",
      });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
      setFinalizeDialog({ isOpen: false, matchId: null });
      
    } catch (error) {
      console.error('Error finalizing swap:', error);
      toast({
        title: "Failed to finalize swap",
        description: "There was a problem finalizing the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel an accepted swap, returning it to pending status
   */
  const handleCancelSwap = async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      // Call the cancel_swap_match function
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Canceled",
        description: "The swap has been canceled and returned to pending status.",
      });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
    } catch (error) {
      console.error('Error canceling swap:', error);
      toast({
        title: "Failed to cancel swap",
        description: "There was a problem canceling the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend the swap confirmation email
   */
  const handleResendEmail = async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      // Use the new sendAcceptanceNotification method from the hook
      await emailNotifications.sendAcceptanceNotification(matchId);
      
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: "Failed to resend email",
        description: "There was a problem resending the email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
    handleFinalizeSwap,
    handleCancelSwap,
    handleResendEmail
  };
};
