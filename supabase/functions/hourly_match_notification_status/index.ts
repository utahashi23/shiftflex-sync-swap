
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
    
    // Create Supabase client with admin role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // Get configuration from supabase/config.toml using pgMeta
    // This will help verify if the function is correctly scheduled
    const { data: functions, error: functionsError } = await supabaseAdmin.rpc('get_edge_functions');
    
    if (functionsError) {
      throw new Error(`Error fetching functions metadata: ${functionsError.message}`);
    }
    
    const hourlyFunction = functions?.find(fn => fn.name === 'hourly_match_notification');
    
    // Get recent invocation logs
    const { data: recentLogs, error: logsError } = await supabaseAdmin.rpc('get_function_invocations', {
      function_name: 'hourly_match_notification',
      limit_count: 5
    });
    
    if (logsError && logsError.message !== 'Function not found') {
      console.warn(`Error fetching function logs: ${logsError.message}`);
    }
    
    // Format logs to be more readable
    const formattedLogs = (recentLogs || []).map(log => ({
      timestamp: log.timestamp,
      status: log.status,
      execution_time: log.execution_time || 'unknown'
    }));

    return new Response(
      JSON.stringify({
        success: true,
        function: {
          name: 'hourly_match_notification',
          exists: !!hourlyFunction,
          scheduled: hourlyFunction?.schedule ? true : false,
          schedule: hourlyFunction?.schedule || 'not scheduled',
          verify_jwt: hourlyFunction?.verify_jwt !== false,
          status: hourlyFunction ? 'active' : 'not found'
        },
        recent_invocations: formattedLogs || [],
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
