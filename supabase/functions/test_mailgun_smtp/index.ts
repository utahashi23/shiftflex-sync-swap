
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
    console.log("Starting test_mailgun_smtp function...")
    
    // SMTP configuration for Mailgun
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: "smtp.mailgun.org",
      port: 587,
      username: "admin@shiftflex.au",
      password: "3kh9umujora5", // In production, use Deno.env.get() instead of hardcoding
    });
    
    const recipient = "njalasankhulani@gmail.com";
    
    console.log(`Sending test email to ${recipient}`);
    
    try {
      await client.send({
        from: "postmaster@shiftflex.au",
        to: recipient,
        subject: "Testing Mailgun SMTP Integration",
        content: "This is a test email sent using the SMTP protocol from a Supabase Edge Function.",
        html: `
          <h2>Mailgun SMTP Test</h2>
          <p>This is a test email sent using SMTP from a Supabase Edge Function.</p>
          <p>If you're receiving this email, the SMTP integration is working correctly.</p>
          <p>Time sent: ${new Date().toISOString()}</p>
        `,
      });
      
      console.log("Email sent successfully via SMTP");
      await client.close();
      
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully via SMTP"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (smtpError) {
      console.error("SMTP error:", smtpError);
      await client.close();
      throw new Error(`SMTP error: ${smtpError.message}`);
    }
  } catch (error) {
    console.error('Error in test_mailgun_smtp function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
