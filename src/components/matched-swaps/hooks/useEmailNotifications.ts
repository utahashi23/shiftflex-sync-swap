
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
   * Send an acceptance notification email for a swap match
   */
  const sendAcceptanceNotification = async (matchId: string): Promise<boolean> => {
    if (!matchId) {
      toast({
        title: "Missing Information",
        description: "Cannot send notification without match details.",
        variant: "destructive"
      });
      return false;
    }

    setIsSending(true);
    
    try {
      console.log(`Sending acceptance notification for match: ${matchId}`);
      // Use the Mailgun-based notification function
      const result = await resendSwapNotification(matchId);
      
      if (!result.success) {
        // Check if it's an API key error
        if (result.error?.includes('Missing') && result.error?.includes('API key')) {
          console.warn('Email notification failed due to missing API key:', result.error);
          toast({
            title: "Email Configuration Issue",
            description: "The swap was processed but email notification could not be sent due to missing configuration.",
            variant: "destructive"
          });
        } else {
          throw new Error(result.error || 'Failed to send acceptance notification');
        }
      } else {
        toast({
          title: "Notification Sent",
          description: "Acceptance notification emails have been sent to all parties.",
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error sending acceptance notification:', error);
      toast({
        title: "Notification Failed",
        description: "Could not send the acceptance notifications. Please check if email is configured correctly.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Send a test email
   */
  const sendTestEmail = async (recipientEmail: string): Promise<boolean> => {
    if (!recipientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address to send a test email.",
        variant: "destructive"
      });
      return false;
    }

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
            <p>Sent via: Mailgun API</p>
          </div>
        `
      });
      
      if (!result.success) {
        // Check if it's an API key error
        if (result.error?.includes('Missing') && result.error?.includes('API key')) {
          console.warn('Test email failed due to missing API key:', result.error);
          toast({
            title: "Email Configuration Issue",
            description: "Email could not be sent due to missing API key configuration in the server.",
            variant: "destructive"
          });
        } else {
          throw new Error(result.error || 'Failed to send test email');
        }
      } else {
        toast({
          title: "Test Email Sent",
          description: `A test email has been sent to ${recipientEmail}. Please check your inbox.`,
        });
      }
      
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

  /**
   * Trigger a test run of the scheduled match notification for a specific user
   */
  const runMatchNotificationTest = async (userId: string): Promise<boolean> => {
    setIsSending(true);
    
    try {
      console.log(`Running test match notification for user: ${userId}`);
      
      const { data, error } = await fetch('https://ponhfgbpxehsdlxjpszg.supabase.co/functions/v1/check_matches_and_notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbmhmZ2JweGVoc2RseGpwc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODM0NDcsImV4cCI6MjA2MTU1OTQ0N30.-n7sUFjxDJUCpMMA0AGnXlQCkaVt31dER91ZQLO3jDs'}`
        },
        body: JSON.stringify({
          triggered_at: new Date().toISOString(),
          test_user_id: userId
        })
      }).then(res => res.json());
      
      if (error) {
        throw new Error(error);
      }
      
      toast({
        title: "Match Notification Test Completed",
        description: "A test email with your pending matches has been sent to your email address.",
      });
      
      return true;
    } catch (error) {
      console.error('Error running match notification test:', error);
      toast({
        title: "Test Failed",
        description: "Could not complete the match notification test. Please check the console for details.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendSwapNotification,
    sendAcceptanceNotification,
    sendTestEmail,
    runMatchNotificationTest,
    isSending
  };
};
