
// Scheduled function that runs hourly to check for match notifications
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This function is triggered on schedule, but can also be invoked manually
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`Hourly match notification check started at: ${timestamp}`);
    
    let requestBody = {};
    try {
      requestBody = await req.json();
      console.log("Received request body:", requestBody);
    } catch (parseError) {
      console.log("No request body or invalid JSON");
      requestBody = { triggered_at: timestamp };
    }
    
    // Add execution context to help with debugging
    console.log(`Execution context: ${req.headers.get('user-agent') || 'scheduler'}`);
    console.log(`Scheduled: ${requestBody.manual_trigger ? 'No (manual trigger)' : 'Yes'}`);
    
    const includeDetailedLogging = requestBody.include_detailed_logging === true;
    if (includeDetailedLogging) {
      console.log("Detailed logging enabled for this execution");
    }
    
    // Create Supabase client with admin role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    console.log(`Creating admin client with URL: ${supabaseUrl.substring(0, 20)}...`);
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // Verify email configuration before proceeding
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    
    if (!mailgunApiKey || !mailgunDomain) {
      console.warn("Missing email configuration (MAILGUN_API_KEY or MAILGUN_DOMAIN)");
      
      if (includeDetailedLogging) {
        console.log("Environment variables check:");
        console.log(`MAILGUN_API_KEY exists: ${!!mailgunApiKey}`);
        console.log(`MAILGUN_DOMAIN exists: ${!!mailgunDomain}`);
        console.log(`MAILGUN_DOMAIN value: ${mailgunDomain || 'not set'}`);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing email configuration. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in Edge Function secrets.",
          timestamp
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    if (includeDetailedLogging) {
      console.log(`MAILGUN configuration: domain=${mailgunDomain}, API key length=${mailgunApiKey.length}`);
    }
    
    // Prepare params for the check_matches_and_notify function
    const functionParams = { 
      triggered_at: timestamp, 
      scheduled: !requestBody.manual_trigger,
      view_url: "https://www.shiftflex.au/shifts",
      debug: true,
      detailed_logging: includeDetailedLogging
    };
    
    console.log(`Calling check_matches_and_notify with params:`, functionParams);
    
    // Call the main check_matches_and_notify function with the correct view_url
    const { data, error } = await supabaseAdmin.functions.invoke("check_matches_and_notify", {
      body: functionParams
    });
    
    if (error) {
      console.error(`Error invoking check_matches_and_notify:`, error);
      throw new Error(`Error invoking check_matches_and_notify: ${error.message}`);
    }
    
    console.log("Hourly check completed with result:", data);
    
    // Format the result data for better readability
    const resultSummary = {
      processed: data?.processed || 0,
      emails_sent: data?.emails_sent || 0,
      email_errors: data?.email_errors || [],
      timestamp: timestamp,
      success: true
    };
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Hourly match notification check completed", 
        result: resultSummary
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in hourly_match_notification function:', error);
    
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
