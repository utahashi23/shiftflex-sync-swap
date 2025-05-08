
// Function to test email configuration and send a test email
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`Email configuration test requested at: ${timestamp}`);
    
    let requestBody: any = {};
    try {
      requestBody = await req.json();
      console.log("Received request body:", requestBody);
    } catch (parseError) {
      console.log("No request body or invalid JSON, using defaults");
      requestBody = { timestamp };
    }
    
    // Create Supabase client with admin role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check email configuration
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    
    if (!mailgunApiKey || !mailgunDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing email configuration. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in Edge Function secrets.",
          config_status: {
            mailgun_api_key_set: !!mailgunApiKey,
            mailgun_domain_set: !!mailgunDomain,
            mailgun_domain: mailgunDomain || "not set"
          },
          timestamp
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Prepare a test email
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Email Configuration Test</h2>
        <p>This is a test email to verify that your email configuration is working correctly.</p>
        <p>If you're seeing this email, your email service is properly configured!</p>
        <p>Timestamp: ${timestamp}</p>
        <p>Sent using: Mailgun API</p>
        <p>Domain: ${mailgunDomain}</p>
      </div>
    `;
    
    const emailData = {
      to: requestBody.recipient_email || "admin@shiftflex.au",
      subject: "Email Configuration Test",
      html: testHtml,
      from: `admin@${mailgunDomain}`,
      verbose_logging: true
    };
    
    console.log(`Sending test email to: ${emailData.to}`);
    
    // Call the send_email function
    const { data, error } = await supabase.functions.invoke('send_email', {
      body: emailData
    });
    
    if (error) {
      console.error("Error sending test email:", error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email sending failed: ${error.message}`,
          config_status: {
            mailgun_api_key_set: !!mailgunApiKey,
            mailgun_domain_set: !!mailgunDomain,
            mailgun_domain: mailgunDomain
          },
          timestamp
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    console.log("Test email sent successfully:", data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email configuration test successful",
        email_sent: true,
        recipient: emailData.to,
        config_status: {
          mailgun_api_key_set: true,
          mailgun_domain_set: true,
          mailgun_domain: mailgunDomain
        },
        result: data,
        timestamp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in test_email_config function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
