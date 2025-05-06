// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { match_id } = await req.json()

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing accept_swap_match for match ID: ${match_id}`)

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Use admin client for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // First, get the match details
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id
      `)
      .eq('id', match_id)
      .single()
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`)
    }

    if (!matchData) {
      throw new Error('Match not found')
    }

    console.log(`Found match data:`, matchData)

    // Update match status to "accepted" if it's currently "pending"
    if (matchData.status !== 'pending') {
      if (matchData.status === 'accepted') {
        // If already accepted, return success
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Match was already accepted',
            status: matchData.status 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      } else {
        // Otherwise, return error
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cannot accept match in ${matchData.status} status` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // Update the match status
    const { data: updatedMatch, error: updateMatchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: 'accepted' })
      .eq('id', match_id)
      .select()
      .single()

    if (updateMatchError) {
      throw new Error(`Error updating match status: ${updateMatchError.message}`)
    }

    console.log(`Successfully updated match status to accepted`)

    // NEW CODE: Update the status of the corresponding swap requests to 'matched'
    // This ensures consistency between matches and requests
    console.log(`Updating swap requests to matched status: ${matchData.requester_request_id}, ${matchData.acceptor_request_id}`)
    const updateRequestsPromises = [
      // Update requester's request status
      supabaseAdmin
        .from('shift_swap_requests')
        .update({ status: 'matched' })
        .eq('id', matchData.requester_request_id),
      
      // Update acceptor's request status
      supabaseAdmin
        .from('shift_swap_requests')
        .update({ status: 'matched' })
        .eq('id', matchData.acceptor_request_id)
    ]
    
    const [updateRequesterRequest, updateAcceptorRequest] = await Promise.all(updateRequestsPromises)
    
    if (updateRequesterRequest.error) {
      console.error(`Error updating requester request status: ${updateRequesterRequest.error.message}`)
    }
    
    if (updateAcceptorRequest.error) {
      console.error(`Error updating acceptor request status: ${updateAcceptorRequest.error.message}`)
    }

    // Send notifications
    // Fetch the request data to get user IDs
    const requestsPromises = [
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', matchData.requester_request_id)
        .single(),
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', matchData.acceptor_request_id)
        .single()
    ]

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises)
    
    if (requesterRequest.error || acceptorRequest.error) {
      console.error(`Error fetching request user IDs:`, {
        requesterError: requesterRequest.error,
        acceptorError: acceptorRequest.error
      })
    } else {
      const requesterUserId = requesterRequest.data.requester_id
      const acceptorUserId = acceptorRequest.data.requester_id
      
      console.log(`Users involved: Requester: ${requesterUserId}, Acceptor: ${acceptorUserId}`)
      
      // Get user emails
      const usersPromises = [
        supabaseAdmin.auth.admin.getUserById(requesterUserId),
        supabaseAdmin.auth.admin.getUserById(acceptorUserId)
      ]

      try {
        const [requesterUser, acceptorUser] = await Promise.all(usersPromises)
        const requesterEmail = requesterUser.data?.user?.email
        const acceptorEmail = acceptorUser.data?.user?.email
        
        console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`)
        
        // Send email notifications in the background
        if (requesterEmail || acceptorEmail) {
          const sendEmails = async () => {
            try {
              // Get shifts details for email content
              const shiftsPromises = [
                supabaseAdmin
                  .from('shifts')
                  .select('id, date, start_time, end_time, truck_name')
                  .eq('id', matchData.requester_shift_id)
                  .single(),
                supabaseAdmin
                  .from('shifts')
                  .select('id, date, start_time, end_time, truck_name')
                  .eq('id', matchData.acceptor_shift_id)
                  .single()
              ]

              const [requesterShift, acceptorShift] = await Promise.all(shiftsPromises)
              
              if (requesterShift.error || acceptorShift.error) {
                console.error(`Error fetching shift details:`, {
                  requesterShiftError: requesterShift.error,
                  acceptorShiftError: acceptorShift.error
                })
                return
              }

              // Format dates and times for email content
              const formatDate = (dateStr) => {
                return new Date(dateStr).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              }

              const formatTime = (timeStr) => {
                return timeStr.substring(0, 5) // Format from "08:00:00" to "08:00"
              }

              // Get Loop.so API key for sending emails
              const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
              
              if (!LOOP_API_KEY) {
                throw new Error('Missing Loop.so API key configuration');
              }

              // Send email notifications
              if (requesterEmail) {
                const requesterEmailContent = `
                  <h2>Your Shift Swap Match Has Been Accepted</h2>
                  <p>Good news! Your shift swap match has been accepted and is pending finalization.</p>
                  <h3>Swap Details:</h3>
                  <p><strong>Your Current Shift:</strong> ${formatDate(requesterShift.data.date)} from ${formatTime(requesterShift.data.start_time)} to ${formatTime(requesterShift.data.end_time)} at ${requesterShift.data.truck_name || 'your assigned location'}</p>
                  <p><strong>Your New Shift (after finalization):</strong> ${formatDate(acceptorShift.data.date)} from ${formatTime(acceptorShift.data.start_time)} to ${formatTime(acceptorShift.data.end_time)} at ${acceptorShift.data.truck_name || 'your colleague\'s location'}</p>
                  <p>The swap will be completed once it has been finalized by you or an administrator. Please check the Matched Swaps section in the app.</p>
                  <p>Thank you for using the Shift Swap system!</p>
                `
                
                try {
                  const requesterEmailResponse = await fetch('https://api.loop.so/v1/email/send', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${LOOP_API_KEY}`
                    },
                    body: JSON.stringify({
                      to: [requesterEmail],
                      from: "admin@shiftflex.au",
                      subject: 'Your Shift Swap Match Has Been Accepted',
                      html: requesterEmailContent
                    })
                  });

                  if (!requesterEmailResponse.ok) {
                    const errorText = await requesterEmailResponse.text();
                    console.error(`Error sending email to requester: ${errorText}`);
                  } else {
                    console.log(`Email sent to requester: ${requesterEmail}`);
                  }
                } catch (emailError) {
                  console.error(`Exception sending email to requester: ${emailError.message}`);
                }
              }

              if (acceptorEmail) {
                const acceptorEmailContent = `
                  <h2>Your Shift Swap Match Has Been Accepted</h2>
                  <p>Good news! Your shift swap match has been accepted and is pending finalization.</p>
                  <h3>Swap Details:</h3>
                  <p><strong>Your Current Shift:</strong> ${formatDate(acceptorShift.data.date)} from ${formatTime(acceptorShift.data.start_time)} to ${formatTime(acceptorShift.data.end_time)} at ${acceptorShift.data.truck_name || 'your assigned location'}</p>
                  <p><strong>Your New Shift (after finalization):</strong> ${formatDate(requesterShift.data.date)} from ${formatTime(requesterShift.data.start_time)} to ${formatTime(requesterShift.data.end_time)} at ${requesterShift.data.truck_name || 'your colleague\'s location'}</p>
                  <p>The swap will be completed once it has been finalized by you or an administrator. Please check the Matched Swaps section in the app.</p>
                  <p>Thank you for using the Shift Swap system!</p>
                `
                
                try {
                  const acceptorEmailResponse = await fetch('https://api.loop.so/v1/email/send', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${LOOP_API_KEY}`
                    },
                    body: JSON.stringify({
                      to: [acceptorEmail],
                      from: "admin@shiftflex.au",
                      subject: 'Your Shift Swap Match Has Been Accepted',
                      html: acceptorEmailContent
                    })
                  });

                  if (!acceptorEmailResponse.ok) {
                    const errorText = await acceptorEmailResponse.text();
                    console.error(`Error sending email to acceptor: ${errorText}`);
                  } else {
                    console.log(`Email sent to acceptor: ${acceptorEmail}`);
                  }
                } catch (emailError) {
                  console.error(`Exception sending email to acceptor: ${emailError.message}`);
                }
              }
            } catch (emailError) {
              console.error('Error sending emails:', emailError)
            }
          }
          
          // Use EdgeRuntime.waitUntil to run email sending in the background
          try {
            // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
            EdgeRuntime.waitUntil(sendEmails())
          } catch (e) {
            // If EdgeRuntime is not available, just run it without waiting
            sendEmails()
          }
        }
      } catch (userFetchError) {
        console.error(`Error fetching user details:`, userFetchError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: updatedMatch }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in accept_swap_match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
