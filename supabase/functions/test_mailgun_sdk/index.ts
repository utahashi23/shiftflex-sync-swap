
// Test Mailgun SDK integration
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Starting test_mailgun_sdk function...")
    
    // Get API key and domain from environment variables
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key');
      throw new Error('Missing Mailgun API key in environment variables');
    }
    
    if (!MAILGUN_DOMAIN) {
      console.error('Missing Mailgun domain');
      throw new Error('Missing Mailgun domain in environment variables');
    }
    
    // Log the domain with some basic validation
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);
    
    // Validate domain format (basic check)
    if (!MAILGUN_DOMAIN.includes('.')) {
      throw new Error('Invalid Mailgun domain format. Should be a valid domain name like "example.com"');
    }
    
    // Get request data
    const requestData = await req.json();
    const recipientEmail = requestData.recipientEmail || "njalasankhulani@gmail.com";
    
    console.log(`Will send test email to: ${recipientEmail}`);
    
    // Log the API key length and first/last few characters (for debugging without exposing the key)
    console.log(`API key length: ${MAILGUN_API_KEY.length}, starts with: ${MAILGUN_API_KEY.substring(0, 3)}..., ends with: ...${MAILGUN_API_KEY.substring(MAILGUN_API_KEY.length - 3)}`);
    
    // Import Mailgun SDK using importmap
    console.log("Importing Mailgun SDK...");
    try {
      const { default: FormData } = await import("npm:form-data@4.0.1");
      const { default: Mailgun } = await import("npm:mailgun.js@11.1.0");
      console.log("Successfully imported Mailgun SDK");
    } catch (importError) {
      console.error("Failed to import Mailgun SDK:", importError);
      throw new Error(`Failed to import Mailgun SDK: ${importError.message}`);
    }
    
    const { default: FormData } = await import("npm:form-data@4.0.1");
    const { default: Mailgun } = await import("npm:mailgun.js@11.1.0");

    console.log("Initializing Mailgun client");
    const mailgun = new Mailgun(FormData);
    
    // Log the client configuration (without exposing full API key)
    console.log("Creating Mailgun client with username: api");
    
    const mg = mailgun.client({
      username: "api",
      key: MAILGUN_API_KEY,
      // For EU domains, uncomment the line below:
      // url: "https://api.eu.mailgun.net"
    });
    
    console.log("Mailgun client initialized successfully");
    console.log("Preparing email data");
    
    // Use admin@shiftflex.au as the sender address
    const sender = `admin@${MAILGUN_DOMAIN}`;
    
    console.log(`Sending test email from ${sender} to ${recipientEmail}`);
    console.log(`Using domain: ${MAILGUN_DOMAIN} for sending`);
    
    try {
      console.log("Calling Mailgun messages.create API...");
      const data = await mg.messages.create(MAILGUN_DOMAIN, {
        from: sender,
        to: [recipientEmail],
        subject: "Testing Mailgun SDK Integration",
        text: "This is a test email sent using the Mailgun SDK in a Supabase Edge Function.",
        html: `
          <h2>Mailgun SDK Test</h2>
          <p>This is a test email sent using the Mailgun SDK from a Supabase Edge Function.</p>
          <p>If you're receiving this email, the integration is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
        `
      });
      
      console.log("Email sent successfully:", data);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully",
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (mailgunError) {
      console.error("Mailgun API error details:", mailgunError);
      
      // Extract more specific error details
      let errorDetails = {
        status: mailgunError.status || 'Unknown',
        message: mailgunError.message || 'Unknown error',
        details: mailgunError.details || 'No additional details',
        type: mailgunError.type || 'Unknown error type'
      };
      
      // Check for network errors
      if (mailgunError.code === 'ENOTFOUND' || mailgunError.code === 'ETIMEDOUT') {
        errorDetails.details = `Network error: ${mailgunError.code}. This might be due to Supabase Edge Function network restrictions.`;
      }
      
      // Check if there's an issue with the API key
      if (mailgunError.status === 401) {
        errorDetails.details = 'Authentication failed. Please check if your API key is correct and active.';
      }
      
      // Check for domain validation issues
      if (mailgunError.status === 400 && mailgunError.details && mailgunError.details.includes('domain')) {
        errorDetails.details = 'Domain validation failed. Please check if your domain is properly configured and verified in Mailgun.';
      }
      
      throw new Error(`Mailgun SDK error: ${JSON.stringify(errorDetails)}`);
    }
  } catch (error) {
    console.error('Error in test_mailgun_sdk function:', error);
    
    let errorType = 'unknown';
    if (error.message && error.message.includes('network')) errorType = 'network';
    if (error.message && error.message.includes('API key')) errorType = 'authentication';
    if (error.message && error.message.includes('domain')) errorType = 'domain';
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      errorType: errorType,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
