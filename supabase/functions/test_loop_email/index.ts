
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
    
    const recipient = "njalasankhulani@gmail.com";
    const sender = "admin@shiftflex.au";
    
    console.log(`Sending test email from ${sender} to ${recipient}`);
    
    try {
      const response = await fetch('https://api.loop.so/v1/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOOP_API_KEY}`
        },
        body: JSON.stringify({
          to: [recipient],
          from: sender,
          subject: "Testing Loop.so Integration",
          html: `
            <h2>Loop.so Test</h2>
            <p>This is a test email sent using the Loop.so API from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the Loop.so integration is working correctly.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Loop.so API error: ${response.status}`, errorText);
        throw new Error(`Loop.so API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log("Email sent successfully via Loop.so:", result);
      
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
      throw new Error(`Loop.so error: ${loopError.message}`);
    }
  } catch (error) {
    console.error('Error in test_loop_email function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
