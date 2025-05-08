
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Setting up hourly match notification job")
    
    // Create a Supabase admin client with service role
    // This is needed to run SQL that creates cron jobs
    const supabaseAdmin = createClient(
      // Supabase API URL
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase SERVICE ROLE KEY - needed for admin operations
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // First check if the pg_cron and pg_net extensions are available
    console.log("Checking for required extensions")
    const { data: extensions, error: extensionsError } = await supabaseAdmin.rpc('get_available_extensions');
    
    if (extensionsError) {
      throw new Error(`Error checking for extensions: ${extensionsError.message}`)
    }
    
    // Check if both required extensions are installed
    const hasCron = extensions.some(ext => ext.name === 'pg_cron' && ext.installed_version);
    const hasNet = extensions.some(ext => ext.name === 'pg_net' && ext.installed_version);
    
    if (!hasCron || !hasNet) {
      return new Response(
        JSON.stringify({ 
          error: 'Required extensions not available', 
          details: {
            pg_cron: hasCron ? 'Available' : 'Not available',
            pg_net: hasNet ? 'Available' : 'Not available'
          },
          message: 'Contact your Supabase project administrator to enable these extensions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Get the project URL
    const projectUrl = Deno.env.get('SUPABASE_URL') ?? '';
    
    // Extract project reference from URL (needed for the function endpoint)
    const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      throw new Error('Could not determine project reference from SUPABASE_URL')
    }
    
    // Get the anon key for calling the function
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // SQL to create/update the cron job
    const createCronJobSql = `
    -- First check if the job already exists, and drop it if it does
    DO $$
    BEGIN
      -- Check if the job exists
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly_match_notifications') THEN
        -- Remove the existing job
        PERFORM cron.unschedule('hourly_match_notifications');
      END IF;
    END $$;

    -- Create the cron job to run hourly
    SELECT cron.schedule(
      'hourly_match_notifications',   -- Job name
      '0 * * * *',                    -- Cron schedule (every hour at minute 0)
      $$
      SELECT
        net.http_post(
            url:='https://${projectRef}.supabase.co/functions/v1/hourly_match_notification',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body:=concat('{"triggered_at": "', now(), '"}')::jsonb
        ) as request_id;
      $$
    );
    `;
    
    // Run the SQL
    console.log("Creating cron job")
    const { data: cronJobResult, error: cronJobError } = await supabaseAdmin.rpc(
      'exec_sql',
      { sql: createCronJobSql }
    );
    
    if (cronJobError) {
      throw new Error(`Error creating cron job: ${cronJobError.message}`)
    }
    
    console.log("Cron job setup success:", cronJobResult)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Hourly match notification job has been scheduled",
        details: {
          schedule: "Every hour at minute 0",
          function: "hourly_match_notification"
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in create_cron_job:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
