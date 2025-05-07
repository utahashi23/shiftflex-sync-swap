
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { acceptSwapMatch, finalizeSwapMatch } from '@/hooks/swap-matches/api';
import { resendSwapNotification } from '@/utils/emailService';

/**
 * Hook to manage swap confirmation state and actions
 */
export const useSwapConfirmation = (onSuccess: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; matchId: string | null }>({
    isOpen: false,
    matchId: null
  });
  const [finalizeDialog, setFinalizeDialog] = useState<{ isOpen: boolean; matchId: string | null }>({
    isOpen: false,
    matchId: null
  });

  /**
   * Handler for Accept Swap button click
   */
  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  };

  /**
   * Handler for Finalize Swap button click
   */
  const handleFinalizeClick = (matchId: string) => {
    setFinalizeDialog({ isOpen: true, matchId });
  };

  /**
   * Handler for resending email notification
   */
  const handleResendEmail = async (matchId: string) => {
    if (!matchId) return;
    
    setIsLoading(true);
    
    try {
      const result = await resendSwapNotification(matchId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast({
        title: "Email Notification Resent",
        description: "The swap notification emails have been resent successfully.",
      });
    } catch (error) {
      console.error('Error resending email notification:', error);
      toast({
        title: "Failed to Resend Email",
        description: "There was a problem resending the notification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handler for accepting a swap match
   */
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      await acceptSwapMatch(confirmDialog.matchId);
      
      toast({
        title: "Swap Accepted",
        description: "The swap has been accepted. Notifications have been sent.",
      });
      
      // Close dialog
      setConfirmDialog({ isOpen: false, matchId: null });
      
      // Execute callback for refreshing data
      onSuccess();
    } catch (error) {
      console.error('Error accepting swap match:', error);
      toast({
        title: "Failed to Accept Swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handler for finalizing a swap match
   */
  const handleFinalizeSwap = async () => {
    if (!finalizeDialog.matchId) return;
    
    setIsLoading(true);
    
    try {
      await finalizeSwapMatch(finalizeDialog.matchId);
      
      toast({
        title: "Swap Finalized",
        description: "The swap has been finalized and calendars updated. Notifications have been sent.",
      });
      
      // Close dialog
      setFinalizeDialog({ isOpen: false, matchId: null });
      
      // Execute callback for refreshing data
      onSuccess();
    } catch (error) {
      console.error('Error finalizing swap match:', error);
      toast({
        title: "Failed to Finalize Swap",
        description: "There was a problem finalizing the swap. Please try again.",
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
    handleResendEmail
  };
};
