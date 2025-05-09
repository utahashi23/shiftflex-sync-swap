
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
    
    // Using full join to get complete shift data including colleague_type
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select(`
        *,
        requester_shift:requester_shift_id (*)
      `)
      .eq('status', type);
      
    if (requestsError) {
      console.error('Error fetching swap requests:', requestsError);
      throw requestsError;
    }
    
    // Get all preferred dates for the requests
    const requestIds = requests.map(r => r.id);
    const { data: preferredDates, error: datesError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      // Continue anyway, just log the error
    }
    
    // Group preferred dates by request ID
    const datesByRequestId = {};
    if (preferredDates) {
      preferredDates.forEach(date => {
        if (!datesByRequestId[date.request_id]) {
          datesByRequestId[date.request_id] = [];
        }
        datesByRequestId[date.request_id].push(date);
      });
    }
    
    // Format the data to include embedded shift data and preferred dates
    const formattedData = requests.map(item => ({
      ...item,
      _embedded_shift: item.requester_shift,
      preferred_dates: datesByRequestId[item.id] || []
    })) || [];
    
    console.log(`Successfully fetched ${formattedData.length} swap requests with status ${type}`);
    
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
