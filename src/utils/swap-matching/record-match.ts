
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Record a shift swap match in the database
 */
export const recordShiftMatch = async (request: any, otherRequest: any, userId: string) => {
  try {
    console.log('Recording match between requests:', {
      request1: request.id,
      request2: otherRequest.id
    });

    // First check if this match already exists using our helper function
    try {
      const { data: existingMatch, error: checkError } = await supabase
        .rpc('check_existing_match', {
          request_id1: request.id,
          request_id2: otherRequest.id
        });
        
      if (checkError) {
        console.error('Error checking for existing match:', checkError);
        return { success: false, error: checkError };
      }
      
      // If a match already exists, just return success without trying to create a duplicate
      if (existingMatch && existingMatch.length > 0) {
        console.log('Match already exists, skipping creation');
        return { success: true, alreadyExists: true };
      }
    } catch (error) {
      console.error('Failed to check for existing match with RPC, trying direct query:', error);
      
      // Fallback to direct query if RPC fails
      const { data: directMatch, error: directError } = await supabase
        .from('shift_swap_potential_matches')
        .select('id')
        .or(`and(requester_request_id.eq.${request.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${request.id})`)
        .limit(1);
        
      if (directError) {
        console.error('Error in direct query for existing match:', directError);
        // Continue with the process, worst case we'll get a unique constraint error
      } else if (directMatch && directMatch.length > 0) {
        console.log('Match found via direct query, skipping creation');
        return { success: true, alreadyExists: true };
      }
    }
    
    // Check if either request is already in a matched state
    const { data: requestStatus } = await supabase
      .from('shift_swap_requests')
      .select('status')
      .in('id', [request.id, otherRequest.id]);
      
    const alreadyMatched = requestStatus?.some(r => r.status === 'matched' || r.status === 'completed');
    
    // If either request is already matched, don't create a duplicate match
    if (alreadyMatched) {
      console.log('One of the requests is already matched, skipping creation');
      return { success: true, alreadyExists: true };
    }
    
    // Record the match in the potential_matches table
    const { data: matchData, error: matchError } = await supabase
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request.id,
        acceptor_request_id: otherRequest.id,
        requester_shift_id: request.requester_shift_id,
        acceptor_shift_id: otherRequest.requester_shift_id,
        match_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
      
    if (matchError) {
      console.error('Error recording match:', matchError);
      return { success: false, error: matchError };
    }
    
    console.log('Match recorded:', matchData);
    
    // Update both requests to matched status
    const requesterUpdate = supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: otherRequest.requester_id,
        acceptor_shift_id: otherRequest.requester_shift_id
      })
      .eq('id', request.id);
      
    const acceptorUpdate = supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: request.requester_id,
        acceptor_shift_id: request.requester_shift_id
      })
      .eq('id', otherRequest.id);
    
    // Execute both updates
    const [requesterResult, acceptorResult] = await Promise.all([requesterUpdate, acceptorUpdate]);
    
    // Check for errors in updates
    if (requesterResult.error) {
      console.error('Error updating requester request:', requesterResult.error);
      return { success: false, error: requesterResult.error };
    }
    
    if (acceptorResult.error) {
      console.error('Error updating acceptor request:', acceptorResult.error);
      return { success: false, error: acceptorResult.error };
    }
    
    // Notify if the current user is involved
    if (request.requester_id === userId || otherRequest.requester_id === userId) {
      toast({
        title: "Match Found!",
        description: `Your shift swap request has been matched.`,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error processing match:', error);
    return { success: false, error };
  }
};
