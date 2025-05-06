
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
    
    // Get API key from environment variables
    const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
    
    if (!LOOP_API_KEY) {
      console.error('Missing Loop.so API key');
      throw new Error('Missing Loop.so API key');
    }
    
    console.log('LOOP_API_KEY available:', !!LOOP_API_KEY);
    console.log('LOOP_API_KEY length:', LOOP_API_KEY.length);
    console.log('LOOP_API_KEY first/last 4 chars:', 
      `${LOOP_API_KEY.substring(0, 4)}...${LOOP_API_KEY.substring(LOOP_API_KEY.length - 4)}`);
    
    // First test network connectivity
    console.log('Testing network connectivity before sending test email');
    
    try {
      // Test connectivity to multiple domains
      const testDomains = [
        { url: 'https://api.loop.so/ping', name: 'Loop.so API' },
        { url: 'https://www.google.com', name: 'Google' }
      ];
      
      for (const domain of testDomains) {
        console.log(`Testing connectivity to ${domain.name}...`);
        const pingController = new AbortController();
        const pingTimeoutId = setTimeout(() => pingController.abort(), 10000);
        
        try {
          const pingResponse = await fetch(domain.url, {
            method: 'GET',
            signal: pingController.signal
          });
          
          clearTimeout(pingTimeoutId);
          console.log(`${domain.name} connectivity test status: ${pingResponse.status}`);
          
          if (!pingResponse.ok && domain.url.includes('loop.so')) {
            console.error(`${domain.name} is not reachable: ${pingResponse.status}`);
            throw new Error(`${domain.name} API unreachable: ${pingResponse.status} ${pingResponse.statusText}`);
          }
        } catch (pingError) {
          clearTimeout(pingTimeoutId);
          console.error(`Error connecting to ${domain.name}:`, pingError);
          
          if (pingError.name === 'AbortError') {
            throw new Error(`${domain.name} API timeout - connection timed out`);
          }
          
          // Only throw for Loop.so API, just log for others
          if (domain.url.includes('loop.so')) {
            throw new Error(`${domain.name} API unreachable: ${pingError.message}`);
          }
        }
      }
      
      console.log('Network connectivity test passed');
      
      // Test API key validity
      console.log('Testing Loop.so API key validity...');
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
          
          console.error(`Loop.so API key validation failed: ${authResponse.status}`, errorText);
          throw new Error(`API key invalid: ${authResponse.status} ${errorText}`);
        }
        
        console.log('Loop.so API key is valid, proceeding with test email');
      } catch (keyError) {
        clearTimeout(authTimeoutId);
        console.error('API key validation error:', keyError);
        
        if (keyError.name === 'AbortError') {
          throw new Error('API key validation timed out');
        }
        
        throw new Error(`API key validation failed: ${keyError.message}`);
      }
    } catch (connectivityError) {
      console.error('Loop.so connectivity test failed:', connectivityError);
      throw new Error(`Loop.so connectivity test failed: ${connectivityError.message}`);
    }
    
    const recipient = "njalasankhulani@gmail.com";
    const sender = "admin@shiftflex.au";
    
    console.log(`Sending test email from ${sender} to ${recipient}`);
    
    try {
      const apiUrl = 'https://api.loop.so/v1/email/send';
      console.log('Using API URL:', apiUrl);
      
      const payload = {
        to: [recipient],
        from: sender,
        subject: "Testing Loop.so Integration",
        html: `
          <h2>Loop.so Test</h2>
          <p>This is a test email sent using the Loop.so API from a Supabase Edge Function.</p>
          <p>If you're receiving this email, the Loop.so integration is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
        `
      };
      
      console.log('Test payload:', JSON.stringify(payload));
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOOP_API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`Loop.so test response status: ${response.status}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read response body';
        }
        
        console.error(`Loop.so API error: ${response.status}`, errorText);
        throw new Error(`Loop.so API error: ${response.status} ${errorText}`);
      }
      
      let result;
      try {
        result = await response.json();
        console.log("Email sent successfully via Loop.so:", result);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
        const text = await response.text();
        console.log('Raw response:', text);
        result = { raw: text };
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully via Loop.so",
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (loopError) {
      console.error("Loop.so error:", loopError);
      
      if (loopError.name === 'AbortError') {
        throw new Error('Request timed out when sending email');
      }
      
      throw new Error(`Loop.so error: ${loopError.message}`);
    }
  } catch (error) {
    console.error('Error in test_loop_email function:', error);
    
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
