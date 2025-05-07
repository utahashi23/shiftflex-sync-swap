
// Test Mailgun SDK integration with network restriction handling
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

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
    
    // Get request data
    const requestData = await req.json();

    // Check if this is a connectivity test
    if (requestData.check_connectivity) {
      console.log("Running connectivity test...")
      try {
        // Test DNS resolution and basic connectivity by trying to connect to api.mailgun.net
        const testResponse = await fetch("https://api.mailgun.net/v3/domains", {
          method: 'HEAD',
          headers: { 'User-Agent': 'Supabase Edge Function Connection Test' }
        });
        
        console.log(`Connection test status: ${testResponse.status}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: "Connection test successful",
          status: testResponse.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (connError) {
        console.error("Connection test failed:", connError);
        
        // Try alternative approach using DNS resolution only
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipResponse.json();
          
          return new Response(JSON.stringify({
            success: false,
            error: "Connection to Mailgun API failed",
            message: "Your Supabase project may have network restrictions",
            error_details: connError.message,
            your_ip: ipData.ip
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (ipError) {
          return new Response(JSON.stringify({
            success: false,
            error: "Network connectivity severely restricted",
            message: "Unable to make any external connections",
            error_details: `${connError.message} and ${ipError.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      }
    }
    
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
    
    const recipientEmail = requestData.recipientEmail || "njalasankhulani@gmail.com";
    
    console.log(`Will send test email to: ${recipientEmail}`);
    
    // Try using direct API call first as it has better chances of working with network restrictions
    try {
      console.log("Trying direct Mailgun API call...");
      
      // Create URL for sending messages via Mailgun API
      const mailgunApiUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
      
      // Use admin@shiftflex.au as the sender address
      const sender = `admin@${MAILGUN_DOMAIN}`;
      
      // Create FormData object for the API request
      const formData = new FormData();
      formData.append('from', sender);
      formData.append('to', recipientEmail);
      formData.append('subject', 'Direct API Test from Supabase Edge Function');
      formData.append('text', 'This is a test email sent using direct Mailgun API from a Supabase Edge Function.');
      formData.append('html', `
        <h2>Mailgun API Direct Test</h2>
        <p>This is a test email sent directly using the Mailgun API from a Supabase Edge Function.</p>
        <p>If you're receiving this email, the integration is working correctly despite potential network restrictions.</p>
        <p>Time sent: ${new Date().toISOString()}</p>
      `);
      
      // Send the request
      const response = await fetch(mailgunApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Mailgun direct API error: ${response.status}`, errorText);
        throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Direct API call successful:", result);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully using direct API",
        data: result,
        method: "direct_api"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (directApiError) {
      console.error("Direct API approach failed:", directApiError);
      
      // If direct API fails, try SDK approach as fallback
      try {
        console.log("Falling back to SDK approach...");
        
        // Import Mailgun SDK using importmap
        const { default: FormData } = await import("npm:form-data@4.0.1");
        const { default: Mailgun } = await import("npm:mailgun.js@11.1.0");
        
        console.log("Successfully imported Mailgun SDK");
        
        const mailgun = new Mailgun(FormData);
        const mg = mailgun.client({
          username: "api",
          key: MAILGUN_API_KEY
        });
        
        const sendResult = await mg.messages.create(MAILGUN_DOMAIN, {
          from: `admin@${MAILGUN_DOMAIN}`,
          to: [recipientEmail],
          subject: "SDK Fallback Test from Supabase Edge Function",
          text: "This is a test email sent using the Mailgun SDK in a Supabase Edge Function.",
          html: `
            <h2>Mailgun SDK Test</h2>
            <p>This is a test email sent using the Mailgun SDK from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the SDK integration is working correctly as a fallback.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `
        });
        
        console.log("SDK approach successful:", sendResult);
        
        return new Response(JSON.stringify({
          success: true,
          message: "Email sent successfully using SDK fallback",
          data: sendResult,
          method: "sdk"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (sdkError) {
        // Both approaches failed - provide detailed diagnostics
        console.error("Both approaches failed:", {
          directApiError, 
          sdkError
        });
        
        // Try to get network diagnostics
        let networkDiagnostics;
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          networkDiagnostics = await ipResponse.json();
        } catch (netError) {
          networkDiagnostics = {
            error: "Unable to perform network diagnostics",
            details: netError.message
          };
        }
        
        throw new Error(`All email sending approaches failed. This is likely due to network restrictions in your Supabase project. API error: ${directApiError.message}. SDK error: ${sdkError.message}`);
      }
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
      timestamp: new Date().toISOString(),
      resolution_steps: [
        "Check if your Supabase project has network restrictions - contact Supabase support for help enabling external API access",
        "Verify your Mailgun API key and domain are correct in your Supabase Edge Function settings",
        "Make sure your Mailgun domain is properly verified in your Mailgun account",
        "Try using the EU endpoint if your Mailgun account is in the EU region"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
