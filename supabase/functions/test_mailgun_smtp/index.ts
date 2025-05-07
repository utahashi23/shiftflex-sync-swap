
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
    const verboseLogging = requestData.verbose_logging || false;
    const recipientEmail = requestData.recipientEmail || "njalasankhulani@gmail.com";
    
    console.log(`Starting test_mailgun_smtp function (attempt ${testAttempt})...`);
    console.log(`Test timestamp: ${requestData.timestamp || new Date().toISOString()}`);
    
    if (verboseLogging) {
      console.log(`Request data: ${JSON.stringify(requestData)}`);
    }
    
    // SMTP configuration for Mailgun with hardcoded credentials
    const client = new SmtpClient();
    
    console.log(`Connecting to SMTP server with username: admin@shiftflex.au`);
    console.log(`Recipient email: ${recipientEmail}`);
    console.log(`Using Mailgun US region endpoint`);
    
    try {
      if (verboseLogging) {
        console.log("Attempting to establish SMTP connection...");
      }
      
      await client.connectTLS({
        hostname: "smtp.mailgun.org", // US region endpoint
        port: 587,
        username: "admin@shiftflex.au",
        password: "Bear151194Ns%", // Using the password provided
      });
      
      console.log("SMTP connection established successfully");
      
      try {
        if (verboseLogging) {
          console.log("Connection successful, attempting to send email...");
        }
        
        await client.send({
          from: "admin@shiftflex.au",
          to: recipientEmail,
          subject: `Mailgun SMTP Test (Attempt ${testAttempt}) - US Region - ${new Date().toISOString()}`,
          content: "This is a test email sent using the SMTP protocol from a Supabase Edge Function.",
          html: `
            <h2>Mailgun SMTP Test - US Region</h2>
            <p>This is a test email sent using SMTP from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the SMTP integration is working correctly.</p>
            <p>Test attempt: ${testAttempt}</p>
            <p>Time sent: ${new Date().toISOString()}</p>
            <p>Region: US</p>
            <p>Recipient: ${recipientEmail}</p>
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
            recipient: recipientEmail,
            region: "US"
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (smtpError) {
        console.error("SMTP sending error:", smtpError);
        
        if (verboseLogging) {
          console.log(`SMTP sending error details: ${JSON.stringify(smtpError)}`);
        }
        
        await client.close();
        throw new Error(`SMTP sending error: ${smtpError.message}`);
      }
    } catch (connectionError) {
      console.error("SMTP connection error:", connectionError);
      
      if (verboseLogging) {
        console.log(`SMTP connection error details: ${JSON.stringify(connectionError)}`);
      }
      
      // Try to diagnose the specific connection issue
      let errorType = "unknown";
      if (connectionError.message && connectionError.message.includes("authentication")) {
        errorType = "authentication";
      } else if (connectionError.message && (
          connectionError.message.includes("connect") || 
          connectionError.message.includes("timeout") ||
          connectionError.message.includes("network") ||
          connectionError.message.includes("bufio")
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
      errorMessage.includes('dns') ||
      errorMessage.includes('bufio');
    
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
