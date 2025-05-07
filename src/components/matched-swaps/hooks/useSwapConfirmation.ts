import { useState } from 'react';
import { useSwapActions } from './useSwapActions';
import { useEmailNotifications } from './useEmailNotifications';
import { toast } from '@/hooks/use-toast';

export type ConfirmDialogState = {
  isOpen: boolean;
  matchId: string | null;
};

export type FinalizeDialogState = {
  isOpen: boolean;
  matchId: string | null;
};

/**
 * Hook for managing swap confirmation dialogs and actions
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
  
  const { handleAcceptSwap: acceptSwap, isLoading } = useSwapActions();
  const { sendNotificationEmail, resendNotificationEmail } = useEmailNotifications();
  
  // Handle click to accept a swap
  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({
      isOpen: true,
      matchId
    });
  };
  
  // Handle click to finalize a swap
  const handleFinalizeClick = (matchId: string) => {
    setFinalizeDialog({
      isOpen: true,
      matchId
    });
  };
  
  // Handle confirmation of accepting a swap
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId) return;
    
    try {
      // Modified: We now use the callback properly to NOT remove the match from the UI
      const success = await acceptSwap(confirmDialog.matchId, (completedSwap) => {
        // This is the onSuccess callback from acceptSwap
        if (completedSwap) {
          // Attempt to send email notification (but don't block UI if it fails)
          sendNotificationEmail(confirmDialog.matchId as string, 'accepted')
            .catch(err => {
              console.error('Failed to send notification email:', err);
            });
        }
        
        // Important: The completedSwap gets an updated status, but it should not
        // disappear from the UI - it just changes to 'accepted' status
        console.log('Swap was accepted successfully, updating UI...');
      });
      
      // Close the dialog
      setConfirmDialog({ isOpen: false, matchId: null });
      
      if (success && onSuccess) {
        toast({
          title: "Swap Accepted",
          description: "The swap has been accepted. Notifications have been sent.",
        });
        
        // Call the onSuccess callback to refresh data
        // This should now show the accepted match in the UI, not remove it
        onSuccess();
      }
    } catch (error) {
      console.error('Error accepting swap:', error);
      setConfirmDialog({ isOpen: false, matchId: null });
      toast({
        title: "Error",
        description: "Failed to accept swap. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle confirmation of finalizing a swap
  const handleFinalizeSwap = async () => {
    if (!finalizeDialog.matchId) return;
    
    try {
      // Implementation for finalizing swap
      // This would call a function similar to acceptSwap
      
      // Close the dialog
      setFinalizeDialog({ isOpen: false, matchId: null });
      
      toast({
        title: "Not Yet Implemented",
        description: "Finalizing swaps is not yet implemented.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error finalizing swap:', error);
      setFinalizeDialog({ isOpen: false, matchId: null });
    }
  };
  
  // Handle sending a reminder email
  const handleResendEmail = async (matchId: string) => {
    try {
      await resendNotificationEmail(matchId, 'accepted');
      
      toast({
        title: "Email Sent",
        description: "A reminder email has been sent.",
      });
    } catch (error) {
      console.error('Error sending reminder email:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder email. Please try again.",
        variant: "destructive"
      });
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
