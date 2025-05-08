
// Function to check the status of the match notification cron job (now every 5 minutes)
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
      schedule: '*/5 * * * *', // Every 5 minutes (from config.toml)
      verify_jwt: false
    };
    
    // Get recent execution logs
    let recentExecutions = [];
    let logsError = null;
    
    try {
      // Try to query the function_execution_log table if it exists
      const { data: executionLogs, error } = await supabaseAdmin
        .from('function_execution_log')
        .select('*')
        .eq('function_name', 'hourly_match_notification')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!error) {
        recentExecutions = executionLogs || [];
      } else {
        // Table might not exist yet
        if (error.message?.includes('does not exist')) {
          console.log("function_execution_log table does not exist yet");
          await createExecutionLogTable(supabaseAdmin);
          recentExecutions = [];
        } else {
          logsError = error.message;
          console.log("Error fetching logs from database:", logsError);
        }
      }
    } catch (e) {
      logsError = e.message;
      console.log("Exception when fetching logs:", logsError);
      
      // Try to create the table if it doesn't exist
      if (e.message?.includes('does not exist')) {
        try {
          await createExecutionLogTable(supabaseAdmin);
        } catch (createError) {
          console.error("Failed to create function_execution_log table:", createError);
        }
      }
    }
    
    // Get information from _http_request_logs table (if it exists)
    let recentLogs = [];
    let httpLogsError = null;
    
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
        httpLogsError = error.message;
        console.log("Error fetching logs from database:", httpLogsError);
      }
    } catch (e) {
      httpLogsError = e.message;
      console.log("Exception when fetching logs:", httpLogsError);
    }
    
    // Format logs to be more readable
    const formattedLogs = (recentLogs || []).map(log => ({
      timestamp: log.timestamp,
      status: log.status,
      method: log.method,
      id: log.id
    }));
    
    // Check if we have any successful executions in the past 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentSuccessfulExecutions = recentExecutions.filter(
      exec => exec.status === 'completed' && exec.created_at > tenMinutesAgo && exec.scheduled === true
    );
    
    // Status evaluation based on execution history
    let functionStatus = "unknown";
    let lastScheduledRun = null;
    
    if (recentExecutions.length > 0) {
      // Find the most recent scheduled execution
      const scheduledExecutions = recentExecutions.filter(exec => exec.scheduled === true);
      if (scheduledExecutions.length > 0) {
        lastScheduledRun = scheduledExecutions[0].created_at;
        
        // Check if it completed successfully
        if (scheduledExecutions[0].status === 'completed') {
          functionStatus = "active";
        } else {
          functionStatus = "failing";
        }
      } else {
        functionStatus = "not triggered automatically";
      }
    } else {
      functionStatus = "no recent executions";
    }
    
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
          schedule: '*/5 * * * *', // Updated to show every 5 minutes
          verify_jwt: false,
          status: functionStatus,
          last_scheduled_run: lastScheduledRun,
          recent_successful_automatic_runs: recentSuccessfulExecutions.length
        },
        dependencies: {
          check_matches_and_notify_exists: checkMatchesExists
        },
        recent_executions: recentExecutions || [],
        recent_http_logs: formattedLogs || [],
        logs_error: logsError || httpLogsError,
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

// Helper function to create the execution log table if it doesn't exist
async function createExecutionLogTable(supabase) {
  try {
    // SQL to create the table
    const { error } = await supabase.rpc('create_function_execution_log_table');
    
    if (error) {
      // Try with raw SQL query if the RPC doesn't exist
      await supabase.sql(`
        CREATE TABLE IF NOT EXISTS public.function_execution_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          function_name TEXT NOT NULL,
          status TEXT NOT NULL,
          scheduled BOOLEAN DEFAULT false,
          error TEXT,
          execution_details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);
    }
    
    return true;
  } catch (e) {
    console.error("Error creating function_execution_log table:", e);
    return false;
  }
}
