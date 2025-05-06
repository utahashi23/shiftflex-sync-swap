
// Loop.so Email Service Integration
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from environment variables
    const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
    
    if (!LOOP_API_KEY) {
      console.error('Missing Loop.so API key');
      throw new Error('Missing Loop.so configuration (API key)');
    }

    // Get email data from request
    const { to, subject, text, html, from, cc, bcc, replyTo } = await req.json() as EmailPayload;
    
    // Validation
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters (to, subject, and either text or html)');
    }

    // Log the email sending attempt
    console.log(`Attempting to send email to ${Array.isArray(to) ? to.join(', ') : to} with subject "${subject}"`);
    console.log(`From address: ${from || "admin@shiftflex.au"}`);
    
    // Prepare request payload for Loop.so
    const payload = {
      to: Array.isArray(to) ? to : [to],
      from: from || "admin@shiftflex.au",
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(cc ? { cc: Array.isArray(cc) ? cc : [cc] } : {}),
      ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {})
    };
    
    // Send the email using Loop.so API
    try {
      console.log('Sending email via Loop.so API with payload:', JSON.stringify(payload));
      
      const response = await fetch('https://api.loop.so/v1/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOOP_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`Loop.so API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Loop.so API error: HTTP status ${response.status}`, errorText);
        throw new Error(`Loop.so API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Email sent successfully via Loop.so:', result);
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (loopError) {
      console.error('Error in Loop.so API call:', loopError);
      throw new Error(`Loop.so API call failed: ${loopError.message}`);
    }
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
