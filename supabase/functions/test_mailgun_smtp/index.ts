
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
    
    // SMTP configuration for Mailgun with hardcoded credentials
    const client = new SmtpClient();
    
    // Create a recipient email address (use the one from request or default)
    const recipient = requestData.recipientEmail || "njalasankhulani@gmail.com";
    
    console.log(`Connecting to SMTP server with username: admin@shiftflex.au`);
    console.log(`Recipient email: ${recipient}`);
    console.log(`Using Mailgun US region endpoint`);
    
    try {
      await client.connectTLS({
        hostname: "smtp.mailgun.org", // US region endpoint
        port: 587,
        username: "admin@shiftflex.au",
        password: "Bear151194Ns%", // Using the password provided
      });
      
      console.log("SMTP connection established successfully");
      
      try {
        await client.send({
          from: "admin@shiftflex.au",
          to: recipient,
          subject: `Mailgun SMTP Test (Attempt ${testAttempt}) - US Region`,
          content: "This is a test email sent using the SMTP protocol from a Supabase Edge Function.",
          html: `
            <h2>Mailgun SMTP Test - US Region</h2>
            <p>This is a test email sent using SMTP from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the SMTP integration is working correctly.</p>
            <p>Test attempt: ${testAttempt}</p>
            <p>Time sent: ${new Date().toISOString()}</p>
            <p>Region: US</p>
          `,
        });
        
        console.log("Email sent successfully via SMTP");
        await client.close();
        
        return new Response(JSON.stringify({
          success: true,
          message: "Email sent successfully via SMTP (US region)",
          details: {
            attempt: testAttempt,
            timestamp: new Date().toISOString(),
            recipient: recipient,
            region: "US"
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
      
      // Try to diagnose the specific connection issue
      let errorType = "unknown";
      if (connectionError.message && connectionError.message.includes("authentication")) {
        errorType = "authentication";
      } else if (connectionError.message && (
          connectionError.message.includes("connect") || 
          connectionError.message.includes("timeout") ||
          connectionError.message.includes("network")
      )) {
        errorType = "network";
      }
      
      throw new Error(`SMTP connection error (${errorType}): ${connectionError.message}`);
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
        timestamp: new Date().toISOString(),
        region: "US"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
