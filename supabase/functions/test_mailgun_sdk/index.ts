
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
    console.log("Starting test_mailgun_sdk function (US region)...")
    
    // Get request data
    const requestData = await req.json();
    const verboseLogging = requestData.verbose_logging || false;
    const testAttempt = requestData.test_attempt || 1;
    const recipientEmail = requestData.recipientEmail || "njalasankhulani@gmail.com";

    if (verboseLogging) {
      console.log(`Request data: ${JSON.stringify(requestData)}`);
    }

    // Check if this is a connectivity test
    if (requestData.check_connectivity) {
      console.log("Running connectivity test...")
      try {
        // Test DNS resolution and basic connectivity by trying to connect to api.mailgun.net (US region)
        console.log("Testing connectivity to api.mailgun.net...");
        const testResponse = await fetch("https://api.mailgun.net/v3/domains", {
          method: 'HEAD',
          headers: { 'User-Agent': 'Supabase Edge Function Connection Test' }
        });
        
        console.log(`Connection test status: ${testResponse.status}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: "Connection test successful",
          status: testResponse.status,
          region: "US"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (connError) {
        console.error("Connection test failed:", connError);
        
        // Try alternative approach using DNS resolution only
        try {
          console.log("Attempting alternative connectivity check...");
          const ipResponse = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipResponse.json();
          
          return new Response(JSON.stringify({
            success: false,
            error: "Connection to Mailgun API (US) failed",
            message: "Your Supabase project may have network restrictions",
            error_details: connError.message,
            your_ip: ipData.ip,
            region: "US"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (ipError) {
          return new Response(JSON.stringify({
            success: false,
            error: "Network connectivity severely restricted",
            message: "Unable to make any external connections",
            error_details: `${connError.message} and ${ipError.message}`,
            region: "US"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
      }
    }
    
    // Get API key and domain from environment variables
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || 'shiftflex.au';
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key');
      throw new Error('Missing Mailgun API key in environment variables');
    }
    
    // Log the domain with validation
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN} (US region)`);
    
    // Validate domain format more strictly
    if (!MAILGUN_DOMAIN || !MAILGUN_DOMAIN.includes('.') || MAILGUN_DOMAIN.startsWith('c1') || MAILGUN_DOMAIN.length > 100) {
      console.error(`Invalid Mailgun domain format: "${MAILGUN_DOMAIN}"`);
      throw new Error(`Invalid Mailgun domain format. Should be a valid domain name like "example.com"`);
    }
    
    console.log(`Will send test email to: ${recipientEmail}`);
    
    // Try using direct API call first as it has better chances of working with network restrictions
    try {
      console.log("Trying direct Mailgun API call (US region)...");
      
      // Create URL for sending messages via Mailgun API - US region
      const mailgunApiUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
      
      // Use admin@domain as the sender address
      const sender = `admin@${MAILGUN_DOMAIN}`;
      
      if (verboseLogging) {
        console.log(`Mailgun API URL: ${mailgunApiUrl}`);
        console.log(`Sender address: ${sender}`);
      }
      
      // Create FormData object for the API request
      const formData = new FormData();
      formData.append('from', sender);
      formData.append('to', recipientEmail);
      formData.append('subject', `Direct API Test from Supabase Edge Function (US region) - ${new Date().toISOString()}`);
      formData.append('text', 'This is a test email sent using direct Mailgun API from a Supabase Edge Function.');
      formData.append('html', `
        <h2>Mailgun API Direct Test (US Region)</h2>
        <p>This is a test email sent directly using the Mailgun API from a Supabase Edge Function.</p>
        <p>If you're receiving this email, the integration is working correctly despite potential network restrictions.</p>
        <p>Region: US</p>
        <p>Time sent: ${new Date().toISOString()}</p>
        <p>Test attempt: ${testAttempt}</p>
        <p>Recipient: ${recipientEmail}</p>
      `);
      
      console.log("Sending request to Mailgun API...");
      // Send the request
      const response = await fetch(mailgunApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
        },
        body: formData
      });
      
      console.log(`Mailgun API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Mailgun direct API error: ${response.status}`, errorText);
        
        if (verboseLogging) {
          console.log(`Full error response: ${errorText}`);
        }
        
        throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Direct API call successful:", result);
      
      if (verboseLogging) {
        console.log(`Full API response: ${JSON.stringify(result)}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully using direct API (US region)",
        data: result,
        method: "direct_api",
        region: "US",
        timestamp: new Date().toISOString(),
        recipient: recipientEmail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (directApiError) {
      console.error("Direct API approach failed:", directApiError);
      
      if (verboseLogging) {
        console.log(`API error details: ${JSON.stringify(directApiError)}`);
        
        // Try to determine the type of error
        let errorType = "unknown";
        if (directApiError.message && directApiError.message.includes("network")) errorType = "network";
        if (directApiError.message && directApiError.message.includes("DNS")) errorType = "dns";
        if (directApiError.message && directApiError.message.includes("timeout")) errorType = "timeout";
        console.log(`Detected error type: ${errorType}`);
      }
      
      throw directApiError;
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
      region: "US",
      resolution_steps: [
        "Check if your Supabase project has network restrictions - contact Supabase support for help enabling external API access",
        "Verify your Mailgun API key and domain are correct in your Supabase Edge Function settings",
        "Make sure your Mailgun domain is properly verified in your Mailgun account",
        "Confirm you're using the correct region (US) for your Mailgun account"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
