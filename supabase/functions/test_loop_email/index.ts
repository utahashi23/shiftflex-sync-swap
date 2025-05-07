// Test Loop.so email integration
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
    console.log("Starting test_loop_email function...")
    
    // Extract request data
    const requestData = await req.json();
    const recipientEmail = requestData.recipientEmail || "njalasankhulani@gmail.com";
    console.log(`Will send test email to: ${recipientEmail}`);
    
    // Get API key from environment variables
    const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
    if (!LOOP_API_KEY) {
      console.error('Missing Loop.so API key');
      throw new Error('Missing Loop.so API key in environment variables');
    }

    // Prepare the API request to Loop.so
    const apiUrl = 'https://api.loop.so/v1/events/send';
    const body = JSON.stringify({
      "name": "test-email",
      "to": recipientEmail,
      "properties": {
        "subject": "Test Email from Supabase Edge Function",
        "content": `
          <h2>Test Email - Loop.so Integration</h2>
          <p>This is a test email sent from a Supabase Edge Function using Loop.so.</p>
          <p>If you're receiving this email, the Loop.so integration is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
          <p>Recipient: ${recipientEmail}</p>
        `
      }
    });

    console.log("Sending request to Loop.so API...");
    // Send the request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${LOOP_API_KEY}`
      },
      body
    });

    console.log(`Loop.so API response status: ${response.status}`);
    
    // If the response is OK, return success
    if (response.ok) {
      const result = await response.json();
      console.log('Email sent successfully:', result);
      
      return new Response(JSON.stringify({ 
        success: true, 
        result, 
        timestamp: new Date().toISOString(),
        recipient: recipientEmail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Otherwise, handle API errors
    const errorData = await response.text();
    console.error('Loop.so API error:', errorData);
    throw new Error(`Loop.so API error: ${response.status} - ${errorData}`);
  } catch (error) {
    console.error('Error sending test email:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
