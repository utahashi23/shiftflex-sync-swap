
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
  test_api_key?: boolean; // Flag to test API key
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

    console.log('LOOP_API_KEY available:', !!LOOP_API_KEY);
    console.log('LOOP_API_KEY length:', LOOP_API_KEY.length);
    console.log('LOOP_API_KEY first/last 4 chars:', 
      `${LOOP_API_KEY.substring(0, 4)}...${LOOP_API_KEY.substring(LOOP_API_KEY.length - 4)}`);
    
    // Get email data from request
    const payload = await req.json() as EmailPayload;
    const { test_api_key, to, subject, text, html, from, cc, bcc, replyTo } = payload;
    
    // API Key Test Mode - Just verify the key is valid without sending an actual email
    if (test_api_key === true) {
      console.log('Testing Loop.so API key validity');
      
      try {
        // Try with a direct ping to healthcheck endpoint first (simpler request)
        console.log('Checking Loop.so API availability with ping request...');
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          // First try a simple ping to see if we can reach Loop.so at all
          const pingResponse = await fetch('https://api.loop.so/ping', {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          console.log('Loop.so ping response:', pingResponse.status, pingResponse.statusText);
          
          if (!pingResponse.ok) {
            console.error('Loop.so ping failed');
            throw new Error(`Loop.so API unreachable: ${pingResponse.status} ${pingResponse.statusText}`);
          }
        } catch (pingError) {
          clearTimeout(timeoutId);
          console.error('Error pinging Loop.so API:', pingError);
          
          if (pingError.name === 'AbortError') {
            throw new Error('Loop.so API timeout - connection timed out');
          }
          
          throw new Error(`Loop.so API unreachable: ${pingError.message}`);
        }
        
        // Now try validating the API key via the /me endpoint
        console.log('Testing Loop.so API key with /me endpoint...');
        const authController = new AbortController();
        const authTimeoutId = setTimeout(() => authController.abort(), 10000);
        
        try {
          const authResponse = await fetch('https://api.loop.so/v1/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${LOOP_API_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: authController.signal
          });
          
          clearTimeout(authTimeoutId);
          console.log(`Loop.so API key test response status: ${authResponse.status}`);
          
          if (!authResponse.ok) {
            let errorText = '';
            try {
              errorText = await authResponse.text();
            } catch (e) {
              errorText = 'Unable to read response body';
            }
            
            console.error(`Loop.so API key test error: HTTP status ${authResponse.status}`, errorText);
            throw new Error(`Invalid API key or API unavailable: ${authResponse.status} ${errorText}`);
          }
          
          let responseData;
          try {
            responseData = await authResponse.json();
            console.log('Loop.so API key validation success. Response data:', JSON.stringify(responseData));
          } catch (e) {
            console.log('Loop.so API key is valid but response is not JSON');
          }
          
          // Successfully validated API key
          return new Response(JSON.stringify({ 
            success: true, 
            message: "API key is valid and Loop.so service is accessible"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        } catch (authError) {
          clearTimeout(authTimeoutId);
          console.error('Error testing Loop.so API key with /me endpoint:', authError);
          
          if (authError.name === 'AbortError') {
            throw new Error('Loop.so API timeout when validating API key');
          }
          
          throw new Error(`API key test failed: ${authError.message}`);
        }
      } catch (apiError) {
        console.error('Error testing Loop.so API key:', apiError);
        throw new Error(`API key test failed: ${apiError.message}`);
      }
    }
    
    // Regular email sending mode
    // Validation
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email parameters (to, subject, and either text or html)');
    }

    // Log the email sending attempt
    console.log(`Attempting to send email to ${Array.isArray(to) ? to.join(', ') : to} with subject "${subject}"`);
    console.log(`From address: ${from || "admin@shiftflex.au"}`);
    
    // Prepare request payload for Loop.so
    const emailPayload = {
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
      console.log('Sending email via Loop.so API with payload:', JSON.stringify(emailPayload));
      
      // Verify URL format
      const apiUrl = 'https://api.loop.so/v1/email/send';
      console.log('Using API URL:', apiUrl);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Make the request with detailed error handling
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOOP_API_KEY}`
          },
          body: JSON.stringify(emailPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`Loop.so API response status: ${response.status}`);
        
        // Check for non-success status codes
        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Unable to read response body';
          }
          
          console.error(`Loop.so API error: HTTP status ${response.status}`, errorText);
          throw new Error(`Loop.so API error: ${response.status} ${errorText}`);
        }
        
        // Parse the response
        let result;
        try {
          result = await response.json();
          console.log('Email sent successfully via Loop.so:', result);
        } catch (jsonError) {
          console.error('Error parsing response JSON:', jsonError);
          const text = await response.text();
          console.log('Raw response:', text);
          result = { raw: text };
        }
        
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch operation failed:', fetchError);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out when sending email');
        }
        
        throw new Error(`Fetch operation failed: ${fetchError.message}`);
      }
    } catch (loopError) {
      console.error('Error in Loop.so API call:', loopError);
      throw new Error(`Loop.so API call failed: ${loopError.message}`);
    }
    
  } catch (error) {
    console.error('Error sending email:', error);
    
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
