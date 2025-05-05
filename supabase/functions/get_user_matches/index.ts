
// Update the getMatchDetails function to include colleague_type
async function getMatchDetails(serviceClient, matches, userId) {
  const results = [];
  
  for (const match of matches) {
    try {
      // Get the requester request (which should always be the user's request when user_initiator_only=true)
      const { data: reqData, error: reqError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.requester_request_id)
        .single();
        
      if (reqError || !reqData) {
        console.error('Error fetching requester request:', reqError);
        continue;
      }
      
      // CRITICAL CHECK: Ensure this is the current user's request
      if (reqData.requester_id !== userId) {
        console.log(`Skipping match ${match.id} - requester is not the current user (${reqData.requester_id} vs ${userId})`);
        continue;
      }
      
      // Get the acceptor request (which should always be the other user's request)
      const { data: acceptorData, error: acceptorError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.acceptor_request_id)
        .single();
        
      if (acceptorError || !acceptorData) {
        console.error('Error fetching acceptor request:', acceptorError);
        continue;
      }
      
      // Get shift details for both requests
      const { data: shifts, error: shiftsError } = await serviceClient
        .from('shifts')
        .select('*')
        .in('id', [reqData.requester_shift_id, acceptorData.requester_shift_id]);
        
      if (shiftsError || !shifts || shifts.length < 2) {
        console.log('Could not fetch shift details, skipping');
        continue;
      }
      
      // Match shifts to requests - user's shift is always the requester shift
      const userShift = shifts.find(s => s.id === reqData.requester_shift_id);
      const otherShift = shifts.find(s => s.id === acceptorData.requester_shift_id);
      
      if (!userShift || !otherShift) {
        console.log('Could not match shifts to requests, skipping');
        continue;
      }
      
      // Get other user's profile
      const { data: otherProfile, error: profileError } = await serviceClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', acceptorData.requester_id)
        .single();
      
      // Format the match data - here "my" always refers to the current user
      results.push({
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: reqData.id,
        other_request_id: acceptorData.id,
        my_shift_id: userShift.id,
        my_shift_date: userShift.date,
        my_shift_start_time: userShift.start_time,
        my_shift_end_time: userShift.end_time,
        my_shift_truck: userShift.truck_name || null,
        my_shift_colleague_type: userShift.colleague_type || 'Unknown',
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name || null,
        other_shift_colleague_type: otherShift.colleague_type || 'Unknown',
        other_user_id: acceptorData.requester_id,
        other_user_name: otherProfile ? 
          `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
          'Unknown User'
      });
    } catch (error) {
      console.error(`Error processing match ${match.id}:`, error);
    }
  }
  
  return results;
}
