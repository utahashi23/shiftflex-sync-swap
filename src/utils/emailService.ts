
import { supabase } from "@/integrations/supabase/client";

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  template?: string;
  templateVariables?: Record<string, any>;
}

/**
 * Send an email using the Mailgun API through a Supabase Edge Function
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string; result?: any }> => {
  try {
    console.log(`Attempting to send email to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    console.log(`Email subject: "${options.subject}"`);
    
    const { data, error } = await supabase.functions.invoke('send_email', {
      body: options
    });
    
    if (error) {
      console.error('Error calling send_email function:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Email function response:', data);
    return data;
  } catch (err: any) {
    console.error('Error in sendEmail:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Helper function to send swap-related emails 
 */
export const sendSwapEmail = async (
  to: string,
  subject: string,
  content: string,
  buttonText?: string,
  buttonLink?: string
): Promise<{ success: boolean; error?: string }> => {
  console.log(`Sending swap email to: ${to}`);
  
  // Create a simple HTML email template with uniform styling
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">${subject}</h2>
      <div style="margin-bottom: 20px; line-height: 1.5;">
        ${content}
      </div>
  `;
  
  // Conditionally add a button
  if (buttonText && buttonLink) {
    html += `
      <a href="${buttonLink}" 
         style="display: inline-block; background-color: #2563eb; color: white; 
                padding: 10px 20px; border-radius: 4px; text-decoration: none; 
                font-weight: bold; margin: 20px 0;">
        ${buttonText}
      </a>
    `;
  }
  
  // Close the email template
  html += `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; 
                  font-size: 14px; color: #666;">
        <p>This is an automated message from the Shift Swap system.</p>
      </div>
    </div>
  `;
  
  // Set a default from address if not provided
  const result = await sendEmail({
    to,
    subject,
    html,
    from: `Shift Swap <no-reply@shiftswap.app>`
  });
  
  if (!result.success) {
    console.error(`Failed to send swap email: ${result.error}`);
  }
  
  return result;
};

// Function to send notifications to both users involved in a swap
export const sendSwapStatusNotification = async (
  requesterEmail: string,
  acceptorEmail: string,
  status: 'accepted' | 'finalized' | 'completed',
  swapDetails: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Sending ${status} status notification to: ${requesterEmail} and ${acceptorEmail}`);
    
    let subject = '';
    let content = '';
    
    switch (status) {
      case 'accepted':
        subject = "Shift Swap Accepted";
        content = `Your shift swap has been accepted and is now waiting for roster approval. ${swapDetails}`;
        break;
      case 'finalized':
        subject = "Shift Swap Finalized";
        content = `Your shift swap has been finalized by roster management. Your calendars have been updated. ${swapDetails}`;
        break;
      case 'completed':
        subject = "Shift Swap Completed";
        content = `Your shift swap has been completed successfully. ${swapDetails}`;
        break;
    }
    
    // Send emails to both parties
    const [requesterResult, acceptorResult] = await Promise.all([
      sendSwapEmail(requesterEmail, subject, content),
      sendSwapEmail(acceptorEmail, subject, content)
    ]);
    
    if (!requesterResult.success || !acceptorResult.success) {
      return { 
        success: false, 
        error: `Email sending failed: ${requesterResult.error || acceptorResult.error}` 
      };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error sending swap notifications:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Function to resend notifications for accepted swaps
 */
export const resendSwapNotification = async (
  matchId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Resending notification for swap match: ${matchId}`);
    
    // Call our edge function to resend the email
    const { data, error } = await supabase.functions.invoke('resend_swap_notification', {
      body: { match_id: matchId }
    });
    
    if (error) {
      console.error('Error resending notification:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Resend notification response:', data);
    return { success: true };
  } catch (err: any) {
    console.error('Error in resendSwapNotification:', err);
    return { success: false, error: err.message };
  }
};
