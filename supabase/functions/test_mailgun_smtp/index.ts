
// Test Mailgun SMTP integration
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    const requestData = await req.json();
    const testAttempt = requestData.test_attempt || 1;
    
    console.log(`Starting test_mailgun_smtp function (attempt ${testAttempt})...`);
    console.log(`Test timestamp: ${requestData.timestamp || new Date().toISOString()}`);
    
    // SMTP configuration for Mailgun
    const client = new SmtpClient();
    
    console.log("Creating SMTP connection to Mailgun...");
    
    try {
      console.log("Connecting to SMTP server...");
      await client.connectTLS({
        hostname: "smtp.mailgun.org",
        port: 587,
        username: "admin@shiftflex.au",
        password: "3kh9umujora5", // In production, use Deno.env.get() instead of hardcoding
      });
      
      console.log("SMTP connection established successfully");
      
      const recipient = "njalasankhulani@gmail.com";
      
      console.log(`Sending test email to ${recipient}`);
      
      try {
        await client.send({
          from: "postmaster@shiftflex.au",
          to: recipient,
          subject: `Testing Mailgun SMTP Integration (Attempt ${testAttempt})`,
          content: "This is a test email sent using the SMTP protocol from a Supabase Edge Function.",
          html: `
            <h2>Mailgun SMTP Test</h2>
            <p>This is a test email sent using SMTP from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the SMTP integration is working correctly.</p>
            <p>Test attempt: ${testAttempt}</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `,
        });
        
        console.log("Email sent successfully via SMTP");
        await client.close();
        
        return new Response(JSON.stringify({
          success: true,
          message: "Email sent successfully via SMTP",
          details: {
            attempt: testAttempt,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (smtpError) {
        console.error("SMTP sending error:", smtpError);
        await client.close();
        throw new Error(`SMTP sending error: ${smtpError.message}`);
      }
    } catch (connectionError) {
      console.error("SMTP connection error:", connectionError);
      throw new Error(`SMTP connection error: ${connectionError.message}`);
    }
  } catch (error) {
    console.error('Error in test_mailgun_smtp function:', error);
    
    // Check if the error is related to network restrictions
    const errorMessage = error.message || String(error);
    const isNetworkRestriction = 
      errorMessage.includes('connection refused') || 
      errorMessage.includes('network') ||
      errorMessage.includes('unreachable') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('dns');
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      isNetworkRestriction: isNetworkRestriction,
      details: {
        errorType: isNetworkRestriction ? 'network_restriction' : 'smtp_error',
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
