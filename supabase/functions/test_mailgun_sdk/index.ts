
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
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || "shiftflex.au";
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key');
      throw new Error('Missing Mailgun API key');
    }
    
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);
    
    // Import Mailgun SDK using importmap
    const { default: FormData } = await import("npm:form-data@4.0.1");
    const { default: Mailgun } = await import("npm:mailgun.js@11.1.0");

    console.log("Initializing Mailgun client");
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: MAILGUN_API_KEY,
      // For EU domains, uncomment the line below:
      // url: "https://api.eu.mailgun.net"
    });
    
    console.log("Preparing email data");
    const recipient = "postmaster@shiftflex.au";
    const sender = "Shift Swap <admin@shiftflex.au>";
    
    console.log(`Sending test email from ${sender} to ${recipient}`);
    
    try {
      const data = await mg.messages.create(MAILGUN_DOMAIN, {
        from: sender,
        to: [recipient],
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
      console.error("Mailgun SDK error:", mailgunError);
      throw new Error(`Mailgun SDK error: ${mailgunError.message}`);
    }
  } catch (error) {
    console.error('Error in test_mailgun_sdk function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
