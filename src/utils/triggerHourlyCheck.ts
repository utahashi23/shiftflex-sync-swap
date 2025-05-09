import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from './emailService';

/**
 * Function to trigger the hourly match notification process
 * @param recipient_email - Optional email address to send the notification to (for testing)
 * @param is_test - Flag to indicate if this is a test run
 */
export const triggerHourlyMatchNotification = async ({ recipient_email, is_test }: { recipient_email?: string, is_test?: boolean }): Promise<void> => {
  try {
    console.log("Triggering hourly match notification process...");

    // Call the Supabase function
    const { data, error } = await supabase.functions.invoke('hourly_match_notification', {
      body: { recipient_email, is_test }
    });

    if (error) {
      console.error("Error invoking hourly_match_notification function:", error);
      throw error;
    }

    console.log("Successfully triggered hourly match notification:", data);
  } catch (error) {
    console.error("Failed to trigger hourly match notification:", error);
    throw error;
  }
};

/**
 * Test the email configuration by sending a test email
 * @param recipientEmail - Email address to send the test email to
 */
export const testEmailConfiguration = async (recipientEmail: string): Promise<void> => {
  try {
    console.log(`Testing email configuration for ${recipientEmail}...`);

    // Send a test email
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
      console.error("Failed to send test email:", result.error);
      throw new Error(result.error || "Failed to send test email");
    }

    console.log("Successfully sent test email:", result);
  } catch (error) {
    console.error("Failed to test email configuration:", error);
    throw error;
  }
};

/**
 * Notify all users with pending swap matches
 * This function sends emails to all users who have swap matches in the "pending" state
 */
export const notifyAllPendingMatches = async (): Promise<{
  success: boolean;
  error?: string;
  emailCount?: number;
}> => {
  try {
    console.log("Starting notification process for all pending matches");
    
    // Call the Supabase edge function to handle the notification process
    const { data, error } = await supabase.functions.invoke('notify_pending_matches', {
      body: {}
    });
    
    if (error) {
      console.error("Error invoking notify_pending_matches function:", error);
      return {
        success: false,
        error: error.message || "Failed to notify users with pending matches"
      };
    }
    
    console.log("Successfully notified users with pending matches:", data);
    
    return {
      success: true,
      emailCount: data?.emailsSent || 0
    };
  } catch (error: any) {
    console.error("Exception in notifyAllPendingMatches:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred"
    };
  }
};
