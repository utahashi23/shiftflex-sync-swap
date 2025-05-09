
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
    const { type = 'pending' } = await req.json();
    
    // Create a Supabase client with the service role key (important for bypassing RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { 'X-Client-Info': 'edge-function' } } }
    );
    
    console.log(`Fetching all swap requests with status: ${type}`);
    
    // Query with service role bypasses all RLS (guaranteed to work)
    const { data, error } = await supabaseAdmin
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*),
        preferred_dates:shift_swap_preferred_dates (*)
      `)
      .eq('status', type);
      
    if (error) {
      console.error('Error fetching swap requests:', error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} swap requests with status ${type}`);
    
    // Format the data to include embedded shift data
    const formattedData = data?.map(item => ({
      ...item,
      _embedded_shift: item.requester_shift
    })) || [];
    
    return new Response(
      JSON.stringify(formattedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error in get_all_requests function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
