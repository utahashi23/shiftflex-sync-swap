
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSwapDialogs } from './useSwapDialogs';
import { useEmailNotifications } from './useEmailNotifications';
import { resendSwapNotification } from '@/utils/emailService';
import { useAuth } from '@/hooks/useAuth';

// The Supabase URL is available from the client file
const SUPABASE_URL = "https://ponhfgbpxehsdlxjpszg.supabase.co";

/**
 * Hook for managing swap confirmation dialogs and actions
 */
export const useSwapConfirmation = (onSuccessCallback?: () => void) => {
  const { confirmDialog, setConfirmDialog, finalizeDialog, setFinalizeDialog } = useSwapDialogs();
  const emailNotifications = useEmailNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth(); // Access the session directly from the auth context

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
      console.log("Attempting to accept swap with match ID:", confirmDialog.matchId);
      
      // Check if we have an active session
      if (!session) {
        console.error("No active session available");
        throw new Error("Authentication required. Please log in again.");
      }
      
      console.log("Authentication available:", !!session);
      
      // Use supabase.functions.invoke() which automatically handles authentication
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: confirmDialog.matchId }
      });
      
      if (error) {
        console.error('Error response from function:', error);
        throw new Error(`Failed to accept swap: ${error.message || error}`);
      }
      
      console.log("Swap acceptance response:", data);
      
      if (data.both_accepted) {
        toast({
          title: "Swap Fully Accepted",
          description: "Both users have accepted the swap. You can now finalize it.",
        });
      } else {
        toast({
          title: "Swap Accepted",
          description: "Waiting for the other user to accept the swap.",
        });
      }
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
    } catch (error: any) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: error.message || "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ isOpen: false, matchId: null });
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
      // Check if we have an active session
      if (!session) {
        console.error("No active session available");
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Use supabase.functions.invoke() which automatically handles authentication
      const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
        body: { match_id: finalizeDialog.matchId }
      });
      
      if (error) {
        console.error('Error finalizing swap:', error);
        throw new Error(`Failed to finalize swap: ${error.message || error}`);
      }
      
      toast({
        title: "Swap Finalized",
        description: "The shift swap has been finalized and the calendar has been updated.",
      });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
    } catch (error: any) {
      console.error('Error finalizing swap:', error);
      toast({
        title: "Failed to finalize swap",
        description: error.message || "There was a problem finalizing the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFinalizeDialog({ isOpen: false, matchId: null });
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
      // Check if we have an active session
      if (!session) {
        console.error("No active session available");
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Use supabase.functions.invoke() which automatically handles authentication
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        console.error('Error canceling swap:', error);
        throw new Error(`Failed to cancel swap: ${error.message || error}`);
      }
      
      toast({
        title: "Swap Canceled",
        description: "The swap has been canceled and returned to pending status.",
      });
      
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      
    } catch (error: any) {
      console.error('Error canceling swap:', error);
      toast({
        title: "Failed to cancel swap",
        description: error.message || "There was a problem canceling the swap. Please try again.",
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
      // Use the resendSwapNotification utility function
      const result = await resendSwapNotification(matchId);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }
      
      toast({
        title: "Email Sent",
        description: "Notification emails have been resent successfully.",
      });
      
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast({
        title: "Failed to resend email",
        description: error.message || "There was a problem resending the email. Please try again.",
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
