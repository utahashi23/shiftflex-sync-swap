
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type TruckData = {
  region: string;
  area: string;
  truck: string;
  address: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables for Supabase connection');
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { global: { headers: { 'X-Client-Info': 'edge-function' } } }
    );
    
    // Parse CSV data from request
    const { trucks } = await req.json();
    
    if (!trucks || !Array.isArray(trucks)) {
      throw new Error('Invalid or missing truck data');
    }
    
    const truckData = trucks as TruckData[];
    
    // Get all regions from the database
    const { data: regions, error: regionsError } = await supabaseAdmin
      .from('regions')
      .select('id, name')
      .eq('status', 'active');
      
    if (regionsError) throw regionsError;
    
    // Get all areas from the database
    const { data: areas, error: areasError } = await supabaseAdmin
      .from('areas')
      .select('id, name, region_id')
      .eq('status', 'active');
      
    if (areasError) throw areasError;
    
    // Get all existing truck names
    const { data: existingTrucks, error: trucksError } = await supabaseAdmin
      .from('truck_names')
      .select('id, name, area_id, address')
      .eq('status', 'active');
      
    if (trucksError) throw trucksError;
    
    // Process each truck entry
    const results = {
      updated: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    for (const truck of truckData) {
      try {
        // Find the region ID
        const region = regions.find(r => r.name.toLowerCase() === truck.region.toLowerCase());
        
        if (!region) {
          results.skipped++;
          results.errors.push(`Region not found: ${truck.region}`);
          continue;
        }
        
        // Find the area ID
        const area = areas.find(a => a.name.toLowerCase() === truck.area.toLowerCase() && a.region_id === region.id);
        
        if (!area) {
          results.skipped++;
          results.errors.push(`Area not found: ${truck.area} in region ${truck.region}`);
          continue;
        }
        
        // Check if truck already exists
        const existingTruck = existingTrucks.find(t => t.name.toLowerCase() === truck.truck.toLowerCase());
        
        if (existingTruck) {
          // Update existing truck with address
          const { error: updateError } = await supabaseAdmin
            .from('truck_names')
            .update({ 
              address: truck.address,
              area_id: area.id 
            })
            .eq('id', existingTruck.id);
            
          if (updateError) {
            throw updateError;
          }
          
          results.updated++;
        } else {
          // Create new truck
          const { error: insertError } = await supabaseAdmin
            .from('truck_names')
            .insert({
              name: truck.truck,
              address: truck.address,
              area_id: area.id,
              status: 'active'
            });
            
          if (insertError) {
            throw insertError;
          }
          
          results.created++;
        }
      } catch (error: any) {
        results.skipped++;
        results.errors.push(`Error processing truck ${truck.truck}: ${error.message || error}`);
      }
    }
    
    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error('Error in import_truck_data function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
})
