
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
      // First try to create the table if it doesn't exist
      await createExecutionLogTable(supabaseAdmin);
      
      // Then query the function_execution_log table
      const { data: executionLogs, error } = await supabaseAdmin
        .from('function_execution_log')
        .select('*')
        .eq('function_name', 'hourly_match_notification')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!error) {
        recentExecutions = executionLogs || [];
      } else {
        logsError = error.message;
        console.log("Error fetching logs from database:", logsError);
      }
    } catch (e) {
      logsError = e.message;
      console.log("Exception when fetching logs:", logsError);
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
        console.log("Error fetching HTTP logs:", httpLogsError);
      }
    } catch (e) {
      httpLogsError = e.message;
      console.log("Exception when fetching HTTP logs:", httpLogsError);
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
    console.log("Attempting to create function_execution_log table if it doesn't exist...");
    
    // First try using the RPC function
    try {
      const { error: rpcError } = await supabase.rpc('create_function_execution_log_table');
      
      if (!rpcError) {
        console.log("Successfully created table using RPC function");
        return true;
      } else if (rpcError.message?.includes('does not exist')) {
        console.log("RPC function doesn't exist, will try direct SQL");
        // Continue to next method if RPC doesn't exist
      } else {
        console.log("RPC error:", rpcError.message);
        // Continue to next method
      }
    } catch (rpcException) {
      console.log("RPC exception:", rpcException.message);
      // Continue to next method
    }
    
    // If RPC fails, try direct SQL query
    const { error: sqlError } = await supabase.from('function_execution_log')
      .select('id')
      .limit(1);
    
    if (sqlError && sqlError.message?.includes('does not exist')) {
      // Table doesn't exist, so try to create it with direct DDL
      // We'll do this by manually inserting and catching if needed
      console.log("Table doesn't exist, attempting insert to trigger creation");
      
      try {
        const { error: insertError } = await supabase.from('function_execution_log').insert({
          function_name: 'table_creation_test',
          status: 'testing',
          scheduled: false,
          execution_details: { test: true }
        });
        
        if (!insertError) {
          console.log("Table now exists!");
          return true;
        } else {
          console.log("Insert error:", insertError.message);
        }
      } catch (insertException) {
        console.log("Insert exception:", insertException.message);
      }
    } else if (!sqlError) {
      console.log("Table already exists!");
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("Error creating function_execution_log table:", e);
    return false;
  }
}
