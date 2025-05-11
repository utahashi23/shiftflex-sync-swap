import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing user_id parameter" 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    console.log(`Processing get_user_leave_swap_matches for user ID: ${user_id}`);
    
    // Create a Supabase client with the admin key for RLS bypass
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get all user's leave swap matches
    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('leave_swap_matches')
      .select(`
        id as match_id,
        status as match_status,
        created_at,
        requester:requester_id(id, first_name, last_name, email, employee_id),
        acceptor:acceptor_id(id, first_name, last_name, email, employee_id),
        requester_block:requester_leave_block_id(
          id, 
          user_leave_blocks!inner(user_id, block_number),
          leave_blocks!inner(start_date, end_date)
        ),
        acceptor_block:acceptor_leave_block_id(
          id, 
          user_leave_blocks!inner(user_id, block_number),
          leave_blocks!inner(start_date, end_date)
        )
      `)
      .or(`requester_id.eq.${user_id},acceptor_id.eq.${user_id}`);
    
    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: matchesError.message 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Transform the data for the frontend
    const transformedMatches = matches.map(match => {
      // Determine if current user is the requester or acceptor
      const isRequester = match.requester?.id === user_id;
      
      // Extract user data
      const myData = isRequester ? match.requester : match.acceptor;
      const otherData = isRequester ? match.acceptor : match.requester;
      
      // Extract block data
      const myBlock = isRequester ? match.requester_block : match.acceptor_block;
      const otherBlock = isRequester ? match.acceptor_block : match.requester_block;
      
      // Format the data in the expected structure
      return {
        match_id: match.match_id,
        match_status: match.match_status,
        created_at: match.created_at,
        is_requester: isRequester,
        
        // My data
        my_user_id: myData?.id,
        my_user_name: `${myData?.first_name || ''} ${myData?.last_name || ''}`.trim() || 'Unknown',
        my_employee_id: myData?.employee_id,
        my_leave_block_id: myBlock?.id,
        my_block_number: myBlock?.user_leave_blocks[0]?.block_number,
        my_start_date: myBlock?.leave_blocks[0]?.start_date,
        my_end_date: myBlock?.leave_blocks[0]?.end_date,
        
        // Other user's data
        other_user_id: otherData?.id,
        other_user_name: `${otherData?.first_name || ''} ${otherData?.last_name || ''}`.trim() || 'Unknown',
        other_employee_id: otherData?.employee_id,
        other_leave_block_id: otherBlock?.id,
        other_block_number: otherBlock?.user_leave_blocks[0]?.block_number,
        other_start_date: otherBlock?.leave_blocks[0]?.start_date,
        other_end_date: otherBlock?.leave_blocks[0]?.end_date,
      };
    });

    return new Response(
      JSON.stringify(transformedMatches),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in get_user_leave_swap_matches function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
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
