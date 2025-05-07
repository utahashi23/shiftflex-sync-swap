
// Follow this setup guide to integrate the Deno Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key and domain from environment variables
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || "shiftflex.au";
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key');
      throw new Error('Missing Mailgun configuration (API key)');
    }

    // Validate domain format - remove any API key that might have been accidentally set as domain
    let domain = MAILGUN_DOMAIN;
    if (domain.includes('-') && domain.length > 30) {
      console.warn('Domain appears to be malformed, possibly an API key. Using default domain.');
      domain = "shiftflex.au";
    }

    // Parse request to get recipient email
    const requestData = await req.json();
    const recipientEmail = requestData.email || "njalasankhulani@gmail.com"; // Default if not provided
    
    console.log(`Testing Mailgun integration with domain ${domain}`);
    console.log(`Sending test email to: ${recipientEmail}`);
    
    // Prepare request for a test email
    const formData = new FormData();
    formData.append('to', recipientEmail);
    formData.append('subject', 'Mailgun Test from ShiftFlex');
    formData.append('from', `ShiftFlex <noreply@${domain}>`);
    formData.append('html', `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Mailgun Integration Test</h2>
        <p>This is a test email sent using the Mailgun email service.</p>
        <p>If you're receiving this, the Mailgun integration is working correctly!</p>
        <p>Time sent: ${new Date().toISOString()}</p>
      </div>
    `);
    
    // Send the test email using Mailgun API
    const mailgunApiUrl = `https://api.mailgun.net/v3/${domain}/messages`;
    console.log(`Using Mailgun API URL: ${mailgunApiUrl}`);

    // Log the authentication info (without exposing the full API key)
    console.log(`Using API key: ${MAILGUN_API_KEY.substring(0, 5)}...${MAILGUN_API_KEY.substring(MAILGUN_API_KEY.length-5)}`);
    
    const response = await fetch(mailgunApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mailgun API error: HTTP status ${response.status}`, errorText);
      
      // Provide more helpful error messages based on status code
      if (response.status === 401) {
        throw new Error(`Mailgun authentication failed: Invalid API key. Please check your API key.`);
      } else if (response.status === 404) {
        throw new Error(`Domain "${domain}" not found. Please verify your domain in Mailgun.`);
      } else {
        throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
      }
    }
    
    const result = await response.json();
    console.log('Test email sent successfully:', result);
    
    // Also attempt to verify domain status
    const domainCheckUrl = `https://api.mailgun.net/v3/domains/${domain}`;
    
    let domainStatus = null;
    try {
      const domainResponse = await fetch(domainCheckUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
        }
      });
      
      if (domainResponse.ok) {
        domainStatus = await domainResponse.json();
      } else {
        console.warn(`Could not check domain status: ${domainResponse.status}`);
      }
    } catch (domainError) {
      console.error('Error checking domain status:', domainError);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      result,
      domain: {
        name: domain,
        status: domainStatus
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error testing Mailgun email integration:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
