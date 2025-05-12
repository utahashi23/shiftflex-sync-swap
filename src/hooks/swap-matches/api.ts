
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../use-toast';
import { formatSwapMatches } from './utils';
import { SwapMatch } from './types';

export const fetchUserMatches = async (userId: string, userPerspectiveOnly: boolean = true, userInitiatorOnly: boolean = true) => {
  console.log('Fetching matches for user:', userId);
  
  try {
    // Call the edge function with explicit parameters to fetch colleague types
    const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
      body: { 
        user_id: userId,
        user_perspective_only: userPerspectiveOnly,
        user_initiator_only: userInitiatorOnly,
        include_colleague_types: true, // Explicitly request colleague types
        include_shift_data: true // Request full shift data
      }
    });
    
    if (matchesError) {
      console.error('Error from get_user_matches function:', matchesError);
      throw matchesError;
    }
    
    console.log('Raw match data from function:', matchesData);
    
    // Debug: Log the first match to check if colleague_type is present
    if (matchesData && Array.isArray(matchesData) && matchesData.length > 0) {
      console.log('First match from API with colleague types:', {
        match_id: matchesData[0].match_id,
        match_status: matchesData[0].match_status,
        my_shift_colleague_type: matchesData[0].my_shift_colleague_type,
        other_shift_colleague_type: matchesData[0].other_shift_colleague_type
      });
    }
    
    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      console.log('No matches found');
      return {
        matches: [],
        pastMatches: [],
        rawApiData: matchesData
      };
    }
    
    // Deduplicate matches by ID before processing
    const uniqueMatches = Array.from(
      new Map(matchesData.map((match: any) => [match.match_id, match])).values()
    );
    
    console.log(`Received ${matchesData.length} matches, deduplicated to ${uniqueMatches.length}`);
    
    const formattedMatches = formatSwapMatches(uniqueMatches);
    
    // Additional logging for debugging status issues
    formattedMatches.forEach((match: SwapMatch) => {
      console.log(`Formatted match ${match.id} has status: ${match.status}`);
    });
    
    // Separate active and past matches
    // Include 'other_accepted', 'dual_accepted' and 'accepted' statuses in active matches
    const activeMatches = formattedMatches.filter((match: SwapMatch) => 
      match.status === 'pending' || 
      match.status === 'accepted' || 
      match.status === 'other_accepted' ||
      match.status === 'dual_accepted'
    );
    
    const pastMatches = formattedMatches.filter((match: SwapMatch) => 
      match.status === 'completed'
    );
    
    console.log(`Processed ${activeMatches.length} active matches and ${pastMatches.length} past matches`);
    console.log(`Active matches statuses: pending=${activeMatches.filter((m: SwapMatch) => m.status === 'pending').length}, accepted=${activeMatches.filter((m: SwapMatch) => m.status === 'accepted').length}, other_accepted=${activeMatches.filter((m: SwapMatch) => m.status === 'other_accepted').length}, dual_accepted=${activeMatches.filter((m: SwapMatch) => m.status === 'dual_accepted').length}`);
    
    return {
      matches: activeMatches,
      pastMatches: pastMatches,
      rawApiData: matchesData
    };
  } catch (error) {
    console.error('Error in fetchUserMatches:', error);
    throw error;
  }
};

export const acceptSwapMatch = async (matchId: string) => {
  console.log('Accepting swap match:', matchId);
  
  try {
    const { data, error } = await supabase.functions.invoke('accept_swap_match', {
      body: { match_id: matchId }
    });
    
    if (error) {
      console.error('Error from accept_swap_match function:', error);
      throw error;
    }
    
    console.log('Swap match accepted response:', data);
    return data;
  } catch (error) {
    console.error('Error in acceptSwapMatch:', error);
    throw error;
  }
};

export const cancelSwapMatch = async (matchId: string) => {
  console.log('Canceling swap match:', matchId);
  
  try {
    const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
      body: { match_id: matchId }
    });
    
    if (error) {
      console.error('Error from cancel_swap_match function:', error);
      throw error;
    }
    
    console.log('Swap match canceled response:', data);
    return data;
  } catch (error) {
    console.error('Error in cancelSwapMatch:', error);
    throw error;
  }
};

export const finalizeSwapMatch = async (matchId: string) => {
  console.log('Finalizing swap match:', matchId);
  
  try {
    const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
      body: { match_id: matchId }
    });
    
    if (error) {
      console.error('Error from finalize_swap_match function:', error);
      throw error;
    }
    
    console.log('Swap match finalized response:', data);
    return data;
  } catch (error) {
    console.error('Error in finalizeSwapMatch:', error);
    throw error;
  }
};

export const completeSwapMatch = async (matchId: string) => {
  console.log('Completing swap match:', matchId);
  
  try {
    const { data, error } = await supabase.functions.invoke('complete_swap_match', {
      body: { match_id: matchId }
    });
    
    if (error) {
      console.error('Error from complete_swap_match function:', error);
      throw error;
    }
    
    console.log('Swap match completed response:', data);
    return data;
  } catch (error) {
    console.error('Error in completeSwapMatch:', error);
    throw error;
  }
};
