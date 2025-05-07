
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
}

/**
 * Send an email using the Loop.so API through a Supabase Edge Function
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string; result?: any }> => {
  try {
    console.log(`Attempting to send email to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    console.log(`Email subject: "${options.subject}"`);
    console.log(`From address: ${options.from || "admin@shiftflex.au"}`);
    
    // Ensure the from address is always set to admin@shiftflex.au if not provided
    const emailOptions = {
      ...options,
      from: options.from || "admin@shiftflex.au"
    };
    
    const { data, error } = await supabase.functions.invoke('loop_send_email', {
      body: emailOptions
    });
    
    if (error) {
      console.error('Error calling loop_send_email function:', error);
      return { success: false, error: error.message || String(error) };
    }
    
    console.log('Email function response:', data);
    return data;
  } catch (err: any) {
    console.error('Error in sendEmail:', err);
    return { success: false, error: err.message || String(err) };
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
    from: `admin@shiftflex.au`
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
    return { success: false, error: err.message || String(err) };
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
      return { success: false, error: error.message || String(error) };
    }
    
    console.log('Resend notification response:', data);
    return { success: true };
  } catch (err: any) {
    console.error('Error in resendSwapNotification:', err);
    return { success: false, error: err.message || String(err) };
  }
};

/**
 * Test email sending with Loop.so implementation
 */
export const testEmailFunctionality = async (): Promise<{
  loopResult: { success: boolean; error?: string; data?: any };
  directResult: { success: boolean; error?: string; data?: any };
}> => {
  try {
    console.log("Testing Loop.so implementation...");
    
    // Test the Loop.so implementation
    const loopResponse = await supabase.functions.invoke('test_loop_email', {
      body: {}
    });
    
    console.log("Loop.so test response:", loopResponse);
    
    // Test the direct API implementation
    const directResponse = await sendEmail({
      to: "njalasankhulani@gmail.com",
      subject: "Test Email via Loop.so",
      from: "admin@shiftflex.au",
      html: `
        <h2>Testing Loop.so Email Function</h2>
        <p>This is a test email sent using the Loop.so email service.</p>
        <p>If you're receiving this email, the email functionality is working correctly.</p>
        <p>Time sent: ${new Date().toISOString()}</p>
      `
    });
    
    console.log("Direct Loop.so test response:", directResponse);
    
    return {
      loopResult: {
        success: !loopResponse.error,
        error: loopResponse.error?.message,
        data: loopResponse.data
      },
      directResult: directResponse
    };
  } catch (err: any) {
    console.error('Error testing email functionality:', err);
    return {
      loopResult: { success: false, error: 'Loop.so test failed' },
      directResult: { success: false, error: 'Direct API test failed' }
    };
  }
};
