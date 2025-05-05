
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
    const { data, error } = await supabase.functions.invoke('send_email', {
      body: options
    });
    
    if (error) {
      console.error('Error calling send_email function:', error);
      return { success: false, error: error.message };
    }
    
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
  
  return sendEmail({
    to,
    subject,
    html
  });
};
