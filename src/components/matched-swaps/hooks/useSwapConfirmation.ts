
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSwapDialogs } from './useSwapDialogs';
import { useEmailNotifications } from './useEmailNotifications';
import { resendSwapNotification } from '@/utils/emailService';

// The Supabase URL is available from the client file, but since supabaseUrl is protected,
// we'll use the constant defined in the integration file
const SUPABASE_URL = "https://ponhfgbpxehsdlxjpszg.supabase.co";

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
      console.log("Attempting to accept swap with match ID:", confirmDialog.matchId);
      
      // Get the current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast({
          title: "Authentication Error",
          description: "Could not verify your session. Please try logging in again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      if (!sessionData.session) {
        toast({
          title: "Session Required",
          description: "You need to be logged in to perform this action.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Session verified, proceeding with swap acceptance");
      
      // Call the accept_swap_match function with proper authorization header
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/accept_swap_match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          body: JSON.stringify({ match_id: confirmDialog.matchId })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from function:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'Failed to accept swap'}`);
      }
      
      const data = await response.json();
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
      // Get the current session explicitly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to finalize a swap.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Call the finalize_swap_match function with proper authorization header
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/finalize_swap_match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          body: JSON.stringify({ match_id: finalizeDialog.matchId })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error finalizing swap:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'Failed to finalize swap'}`);
      }
      
      const data = await response.json();
      
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
      // Get the current session explicitly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to cancel a swap.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Call the cancel_swap_match function with proper authorization header
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/cancel_swap_match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`
          },
          body: JSON.stringify({ match_id: matchId })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error canceling swap:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText || 'Failed to cancel swap'}`);
      }
      
      const data = await response.json();
      
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
