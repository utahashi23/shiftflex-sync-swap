
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

    console.log(`Processing finalize_swap_match for match ID: ${match_id}`)

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // First, get the match details to obtain user IDs and shift information
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

    // Check if the match is in "accepted" status
    if (matchData.status !== 'accepted') {
      throw new Error(`Cannot finalize match in ${matchData.status} status. Match must be accepted first.`)
    }

    console.log(`Found match data:`, matchData)

    // Fetch the request data to get user IDs
    const requestsPromises = [
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.requester_request_id)
        .single(),
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.acceptor_request_id)
        .single()
    ]

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises)
    
    if (requesterRequest.error) {
      throw new Error(`Error fetching requester request: ${requesterRequest.error.message}`)
    }
    
    if (acceptorRequest.error) {
      throw new Error(`Error fetching acceptor request: ${acceptorRequest.error.message}`)
    }

    const requesterUserId = requesterRequest.data.requester_id
    const acceptorUserId = acceptorRequest.data.requester_id
    
    console.log(`Users involved: Requester ID: ${requesterUserId}, Acceptor ID: ${acceptorUserId}`)

    // Fetch users' email addresses
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId)
    ]

    const [requesterUser, acceptorUser] = await Promise.all(usersPromises)
    
    if (requesterUser.error) {
      console.error(`Error fetching requester user: ${requesterUser.error.message}`)
      // Continue even if we can't get the user's email
    }
    
    if (acceptorUser.error) {
      console.error(`Error fetching acceptor user: ${acceptorUser.error.message}`)
      // Continue even if we can't get the user's email
    }

    const requesterEmail = requesterUser.data?.user?.email
    const acceptorEmail = acceptorUser.data?.user?.email
    
    console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`)

    // Fetch shift details for email content
    const shiftsPromises = [
      supabaseAdmin
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name, user_id')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name, user_id')
        .eq('id', matchData.acceptor_shift_id)
        .single()
    ]

    const [requesterShift, acceptorShift] = await Promise.all(shiftsPromises)
    
    if (requesterShift.error) {
      console.error(`Error fetching requester shift: ${requesterShift.error.message}`)
      // Continue even if we can't get shift details
    }
    
    if (acceptorShift.error) {
      console.error(`Error fetching acceptor shift: ${acceptorShift.error.message}`)
      // Continue even if we can't get shift details
    }

    // Begin transaction to swap user assignments on the shifts
    // This is the critical part where we actually swap the shifts between users
    const updateShiftsPromises = [
      // Update requester's original shift to now be assigned to the acceptor
      supabaseAdmin
        .from('shifts')
        .update({ user_id: acceptorUserId })
        .eq('id', requesterShift.data.id),
      
      // Update acceptor's original shift to now be assigned to the requester
      supabaseAdmin
        .from('shifts')
        .update({ user_id: requesterUserId })
        .eq('id', acceptorShift.data.id)
    ]

    const [updateRequesterShift, updateAcceptorShift] = await Promise.all(updateShiftsPromises)
    
    if (updateRequesterShift.error) {
      throw new Error(`Error updating requester shift: ${updateRequesterShift.error.message}`)
    }
    
    if (updateAcceptorShift.error) {
      throw new Error(`Error updating acceptor shift: ${updateAcceptorShift.error.message}`)
    }

    // Update match status to "completed"
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: 'completed' })
      .eq('id', match_id)
      .select()
    
    if (updateError) {
      throw new Error(`Error updating match: ${updateError.message}`)
    }

    console.log(`Successfully updated match status to completed and swapped shift assignments`)

    // Send emails in the background
    const sendEmails = async () => {
      try {
        // Format the shift dates and times for email content
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

        // Get Loop.so API key
        const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
        
        if (!LOOP_API_KEY) {
          throw new Error('Missing Loop.so API key configuration');
        }

        // Only attempt to send emails if we have email addresses
        if (requesterEmail) {
          const requesterEmailContent = `
            <h2>Shift Swap Finalized</h2>
            <p>Your shift swap has been finalized and your calendar has been updated.</p>
            <h3>Swap Details:</h3>
            <p><strong>Your Original Shift:</strong> ${formatDate(requesterShift.data?.date)} from ${formatTime(requesterShift.data?.start_time)} to ${formatTime(requesterShift.data?.end_time)} at ${requesterShift.data?.truck_name || 'your assigned location'}</p>
            <p><strong>Your New Shift:</strong> ${formatDate(acceptorShift.data?.date)} from ${formatTime(acceptorShift.data?.start_time)} to ${formatTime(acceptorShift.data?.end_time)} at ${acceptorShift.data?.truck_name || 'your colleague\'s location'}</p>
            <p><strong>Important:</strong> Your official schedule has been updated. Please make sure to update any personal calendars you maintain.</p>
            <p>Thank you for using the Shift Swap system!</p>
          `
          
          // Send email to requester using Loop.so
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
                subject: 'Your Shift Swap Has Been Finalized',
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
            <h2>Shift Swap Finalized</h2>
            <p>Your shift swap has been finalized and your calendar has been updated.</p>
            <h3>Swap Details:</h3>
            <p><strong>Your Original Shift:</strong> ${formatDate(acceptorShift.data?.date)} from ${formatTime(acceptorShift.data?.start_time)} to ${formatTime(acceptorShift.data?.end_time)} at ${acceptorShift.data?.truck_name || 'your assigned location'}</p>
            <p><strong>Your New Shift:</strong> ${formatDate(requesterShift.data?.date)} from ${formatTime(requesterShift.data?.start_time)} to ${formatTime(requesterShift.data?.end_time)} at ${requesterShift.data?.truck_name || 'your colleague\'s location'}</p>
            <p><strong>Important:</strong> Your official schedule has been updated. Please make sure to update any personal calendars you maintain.</p>
            <p>Thank you for using the Shift Swap system!</p>
          `
          
          // Send email to acceptor using Loop.so
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
                subject: 'Shift Swap Finalized',
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
        // We don't throw here since the primary operation (updating the match) succeeded
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

    return new Response(
      JSON.stringify({ success: true, data: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in finalize_swap_match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
