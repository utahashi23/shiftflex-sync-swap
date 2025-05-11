
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin_secret } = await req.json();
    
    // Create a Supabase client with the admin key for RLS bypass
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find potential matches using the PostgreSQL function
    const { data: matches, error: matchesError } = await supabase.rpc(
      "find_leave_swap_matches"
    );

    if (matchesError) {
      console.error("Error finding matches:", matchesError);
      throw matchesError;
    }

    console.log(`Found ${matches.length} potential matches`);

    // Create matches in the database
    const createdMatches = [];
    
    for (const match of matches) {
      // Create the match
      const { data: matchData, error: matchError } = await supabase.rpc(
        "create_leave_swap_match",
        {
          p_requester_id: match.requester1_id,
          p_acceptor_id: match.requester2_id,
          p_requester_leave_block_id: match.requester1_leave_block_id,
          p_acceptor_leave_block_id: match.requester2_leave_block_id,
        }
      );

      if (matchError) {
        console.error("Error creating match:", matchError);
        continue;
      }

      createdMatches.push({
        match_id: matchData,
        requester1_id: match.requester1_id,
        requester2_id: match.requester2_id,
        requester1_block_number: match.requester1_block_number,
        requester2_block_number: match.requester2_block_number,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches_found: matches.length,
        matches_created: createdMatches.length,
        created_matches: createdMatches,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in find_leave_swap_matches function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
