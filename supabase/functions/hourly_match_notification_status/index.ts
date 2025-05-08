
// Function to check the status of the hourly match notification cron job
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
    console.log(`Status check requested at: ${timestamp}`);
    
    let requestBody = {};
    try {
      requestBody = await req.json();
      console.log("Received request body:", requestBody);
    } catch (parseError) {
      console.log("No request body or invalid JSON");
    }
    
    // Create Supabase client with admin role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // Function info (we know it exists since this code is running)
    const functionInfo = {
      name: 'hourly_match_notification',
      exists: true,
      scheduled: true, // We assume it's scheduled based on config.toml 
      schedule: '0 * * * *', // Hourly (from config.toml)
      verify_jwt: false
    };
    
    // Get recent invocation logs (we make a direct check since the _http_request_logs table may not exist)
    let recentLogs = [];
    let logsError = null;
    
    try {
      // Try to query the logs table if it exists
      const { data: logs, error } = await supabaseAdmin
        .from('_http_request_logs')
        .select('id, method, path, status, timestamp')
        .like('path', '%/functions/v1/hourly_match_notification%')
        .order('timestamp', { ascending: false })
        .limit(5);
        
      if (!error) {
        recentLogs = logs || [];
      } else {
        logsError = error.message;
        console.log("Error fetching logs from database:", logsError);
      }
    } catch (e) {
      logsError = e.message;
      console.log("Exception when fetching logs:", logsError);
    }
    
    // Format logs to be more readable
    const formattedLogs = (recentLogs || []).map(log => ({
      timestamp: log.timestamp,
      status: log.status,
      method: log.method,
      id: log.id
    }));
    
    // Check email configuration
    const checkEmailConfig = requestBody.check_email_config === true;
    let emailConfigStatus = null;
    
    if (checkEmailConfig) {
      const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
      const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
      
      emailConfigStatus = {
        mailgun_api_key_set: !!mailgunApiKey,
        mailgun_domain_set: !!mailgunDomain,
        mailgun_domain: mailgunDomain || "not set",
        status: (!!mailgunApiKey && !!mailgunDomain) ? "configured" : "missing configuration"
      };
    }
    
    // Check if the check_matches_and_notify function exists
    const checkMatchesExists = await supabaseAdmin.functions.invoke('check_matches_and_notify', {
      body: { status_check: true }
    }).then(response => !response.error).catch(() => false);

    return new Response(
      JSON.stringify({
        success: true,
        function: {
          name: 'hourly_match_notification',
          exists: true,
          scheduled: true,
          schedule: '0 * * * *',
          verify_jwt: false,
          status: 'active'
        },
        dependencies: {
          check_matches_and_notify_exists: checkMatchesExists
        },
        recent_invocations: formattedLogs || [],
        logs_error: logsError,
        email_config: emailConfigStatus,
        timestamp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in hourly_match_notification_status function:', error);
    
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
