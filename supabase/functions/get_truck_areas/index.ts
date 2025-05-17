
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

// Create a Supabase client with the Auth context of the function
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  }
)

serve(async (req) => {
  try {
    // Parse the request body
    const { truck_names } = await req.json()
    
    if (!Array.isArray(truck_names) || truck_names.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid truck names provided' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch the area IDs for the given truck names
    const { data, error } = await supabaseClient
      .from('truck_names')
      .select('name, area_id')
      .in('name', truck_names)

    if (error) {
      throw error
    }

    // Map the results to match what the client expects
    const result = data.map(item => ({
      truck_name: item.name,
      area_id: item.area_id
    }))

    // Return the results
    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
