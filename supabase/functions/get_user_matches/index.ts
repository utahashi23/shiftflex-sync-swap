import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Add the OPTIONS method
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      force_check = false,
      verbose = false,
      user_perspective_only = true,
      user_initiator_only = true,
      include_colleague_types = true,
      include_shift_data = true,
      bypass_rls = false,
    } = await req.json();

    console.log(`get_user_matches called for user: ${user_id}`);
    console.log(`Options: force_check=${force_check}, verbose=${verbose}, user_perspective_only=${user_perspective_only}, user_initiator_only=${user_initiator_only}, include_colleague_types=${include_colleague_types}, include_shift_data=${include_shift_data}, bypass_rls=${bypass_rls}`);

    if (!user_id) {
      console.error("Missing user_id parameter");
      return new Response(
        JSON.stringify({ error: "Missing user_id parameter" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Use service role for bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch all relevant data
    const [
      { data: requests, error: requestsError },
      { data: preferredDates, error: preferredDatesError },
      { data: shifts, error: shiftsError },
      { data: profiles, error: profilesError },
      { data: matches, error: matchesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("shift_swap_requests")
        .select("*")
        .eq("requester_id", user_id),
      supabaseAdmin.from("shift_swap_preferred_dates").select("*"),
      supabaseAdmin.from("shifts").select("*"),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("shift_swap_potential_matches").select("*"),
    ]);

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      return new Response(JSON.stringify({ error: requestsError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (preferredDatesError) {
      console.error("Error fetching preferred dates:", preferredDatesError);
      return new Response(
        JSON.stringify({ error: preferredDatesError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
      return new Response(JSON.stringify({ error: shiftsError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (matchesError) {
      console.error("Error fetching potential matches:", matchesError);
      return new Response(JSON.stringify({ error: matchesError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Filter requests based on user perspective
    const filteredRequests = requests.filter((request) => {
      if (user_perspective_only) {
        return request.requester_id === user_id;
      }
      return true;
    });

    // Further filter requests based on user initiator
    const initiatorFilteredRequests = requests.filter((request) => {
      if (user_initiator_only) {
        return request.requester_id === user_id;
      }
      return true;
    });

    // Prepare data for formatting
    const shiftsMap = shifts.reduce((acc, shift) => {
      acc[shift.id] = shift;
      return acc;
    }, {});

    const requestsMap = requests.reduce((acc, request) => {
      acc[request.id] = request;
      return acc;
    }, {});

    const profilesMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    // Format the matches
    const formattedMatches = formatMatches(
      matches,
      shifts,
      requests,
      profiles,
    );

    // Return the formatted matches
    return new Response(JSON.stringify(formattedMatches), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// When formatting matches, make sure to include the is_other_accepted flag
const formatMatches = (matches, shifts, requests, profiles) => {
  const formattedMatches = matches.map((match, index) => {
    const shift1 = shifts.find((s) => s.id === match.requester_shift_id);
    const shift2 = shifts.find((s) => s.id === match.acceptor_shift_id);
    const request1 = requests.find((r) => r.id === match.requester_request_id);
    const request2 = requests.find((r) => r.id === match.acceptor_request_id);
    const profile1 = profiles.find((p) => p.id === request1?.requester_id);
    const profile2 = profiles.find((p) => p.id === request2?.requester_id);

    const formattedMatch = {
      match_id: match.id,
      match_status: match.status,
      my_shift_id: shift1?.id,
      my_shift_date: shift1?.date,
      my_shift_start_time: shift1?.start_time,
      my_shift_end_time: shift1?.end_time,
      my_shift_truck: shift1?.truck_name,
      my_shift_colleague_type: shift1?.colleague_type,
      other_shift_id: shift2?.id,
      other_shift_date: shift2?.date,
      other_shift_start_time: shift2?.start_time,
      other_shift_end_time: shift2?.end_time,
      other_shift_truck: shift2?.truck_name,
      other_shift_colleague_type: shift2?.colleague_type,
      other_user_id: request2?.requester_id,
      other_user_name: profile2
        ? `${profile2.first_name} ${profile2.last_name}`
        : "Unknown User",
      my_request_id: request1?.id,
      other_request_id: request2?.id,
      created_at: match.match_date,
      is_other_accepted: match.is_other_accepted || false,
    };

    if (index === 0) {
      console.log(`First formatted match:`, {
        match_id: formattedMatch.match_id,
        my_shift_colleague_type: formattedMatch.my_shift_colleague_type,
        other_shift_colleague_type: formattedMatch.other_shift_colleague_type,
        is_other_accepted: formattedMatch.is_other_accepted,
      });
    }

    return formattedMatch;
  });

  return formattedMatches;
};
