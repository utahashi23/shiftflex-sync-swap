
import { useState } from 'react';
import { sendEmail, sendSwapEmail, resendSwapNotification } from '@/utils/emailService';
import { toast } from '@/hooks/use-toast';
import { SwapMatch } from '../types';

/**
 * Hook for handling email notifications for swap actions
 */
export const useEmailNotifications = () => {
  const [isSending, setIsSending] = useState(false);

  /**
   * Send a notification email about a swap
   */
  const sendSwapNotification = async (
    recipientEmail: string, 
    subject: string,
    content: string,
    buttonText?: string,
    buttonLink?: string
  ): Promise<boolean> => {
    if (!recipientEmail) {
      console.error('Cannot send email: Missing recipient email');
      return false;
    }

    setIsSending(true);
    
    try {
      const result = await sendSwapEmail(
        recipientEmail,
        subject,
        content,
        buttonText,
        buttonLink
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification email');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending swap notification:', error);
      toast({
        title: "Notification Failed",
        description: "Could not send the email notification. The system will continue to process the swap.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Send a notification email for a match
   */
  const sendNotificationEmail = async (matchId: string, type: 'accepted' | 'finalized' | 'completed'): Promise<boolean> => {
    setIsSending(true);
    
    try {
      // Call the resendSwapNotification function which handles email logic
      const result = await resendSwapNotification(matchId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification email');
      }
      
      return true;
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Resend a notification email for a match
   */
  const resendNotificationEmail = async (matchId: string, type: 'accepted' | 'finalized' | 'completed'): Promise<boolean> => {
    setIsSending(true);
    
    try {
      const result = await resendSwapNotification(matchId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend notification');
      }
      
      return true;
    } catch (error) {
      console.error(`Error resending ${type} notification:`, error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Send a test email
   */
  const sendTestEmail = async (recipientEmail: string): Promise<boolean> => {
    setIsSending(true);
    
    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: "Test Email from Shift Swap System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Test Email</h2>
            <p>This is a test email from the Shift Swap system.</p>
            <p>If you're seeing this, the email configuration is working correctly!</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
          </div>
        `
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send test email');
      }
      
      toast({
        title: "Test Email Sent",
        description: "A test email has been sent to your address. Please check your inbox.",
      });
      
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Email Failed",
        description: "Could not send the test email. Please check the console for details.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendSwapNotification,
    sendNotificationEmail,
    resendNotificationEmail,
    sendTestEmail,
    isSending
  };
};
