
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { query } = await req.json();
    
    // Security validation - only allow SELECT statements to prevent malicious use
    if (!query.trim().toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Create a Supabase client with the service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { 'X-Client-Info': 'edge-function' } } }
    );
    
    console.log(`Executing raw query: ${query}`);
    
    // Execute the raw query
    const { data, error } = await supabaseAdmin.rpc('run_sql_query', { sql_query: query });
    
    if (error) {
      console.error('Error executing raw query:', error);
      throw error;
    }
    
    return new Response(
      JSON.stringify(data || []),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error in execute_raw_query function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
