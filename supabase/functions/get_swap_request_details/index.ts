
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  request_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the admin key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Parse request body
    const requestData: RequestBody = await req.json();
    const { request_id } = requestData;
    
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'No request_id provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // First get the swap request
    const { data: requestData, error: requestError } = await supabase
      .from('shift_swap_requests')
      .select('id, requester_id, status, created_at, preferred_dates_count')
      .eq('id', request_id)
      .single();
      
    if (requestError) {
      console.error('Error fetching request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Error fetching request', details: requestError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    if (!requestData) {
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // Now get the profile info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', requestData.requester_id)
      .single();
      
    // Format the requester name
    const requesterName = profileData 
      ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
      : 'Unknown User';
    
    // Combine all the data
    const responseData = {
      ...requestData,
      requester_name: requesterName
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in get_swap_request_details:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
