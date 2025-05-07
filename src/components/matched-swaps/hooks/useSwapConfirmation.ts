
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
  const { sendSwapNotification } = useEmailNotifications();
  
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
      // Call the accept swap function WITHOUT removing the swap from UI
      const success = await acceptSwap(confirmDialog.matchId, (completedSwap) => {
        // This is the onSuccess callback from acceptSwap
        if (completedSwap) {
          // Attempt to send notification (but don't block UI if it fails)
          try {
            sendSwapNotification(
              '', // Will be determined by backend
              'Shift Swap Accepted',
              'Your shift swap has been accepted and is waiting for finalization.',
              'View Swap Details',
              '/shifts'
            ).catch(err => {
              console.error('Failed to send notification:', err);
            });
          } catch (err) {
            console.error('Error sending notification:', err);
          }
        }
        
        console.log('Swap was accepted successfully, UI should update to show accepted status');
      });
      
      // Close the dialog regardless of outcome
      setConfirmDialog({ isOpen: false, matchId: null });
      
      if (success && onSuccess) {
        toast({
          title: "Swap Accepted",
          description: "The swap has been accepted. Notifications have been sent.",
        });
        
        // This should trigger a refresh that maintains the accepted swap in the UI
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
      try {
        await sendSwapNotification(
          '', // Will be determined by backend
          'Shift Swap Reminder',
          'This is a reminder about your accepted shift swap that needs finalization.',
          'View Swap Details',
          '/shifts'
        );
        
        toast({
          title: "Email Sent",
          description: "A reminder email has been sent.",
        });
      } catch (error) {
        throw error;
      }
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
