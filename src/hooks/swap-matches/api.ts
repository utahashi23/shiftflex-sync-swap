
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../use-toast';
import { formatSwapMatches } from './utils';
import { SwapMatch } from './types';

export const fetchUserMatches = async (userId: string, userPerspectiveOnly: boolean = true, userInitiatorOnly: boolean = true) => {
  console.log('Fetching matches for user:', userId);
  
  try {
    // Explicitly request to include colleague types and full shift data in the function call
    const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
      body: { 
        user_id: userId,
        user_perspective_only: userPerspectiveOnly,
        user_initiator_only: userInitiatorOnly,
        include_colleague_types: true, // Request colleague types explicitly
        include_full_shift_data: true  // Ask for complete shift data including colleague_type
      }
    });
    
    if (matchesError) throw matchesError;
    
    console.log('Raw match data from function:', matchesData);
    
    // Log the first match to see if colleague_type is present
    if (matchesData && Array.isArray(matchesData) && matchesData.length > 0) {
      console.log('First match data sample with colleague_type:', {
        my_shift_colleague_type: matchesData[0].my_shift_colleague_type,
        other_shift_colleague_type: matchesData[0].other_shift_colleague_type,
        // Also check if data is nested in shift data objects
        my_shift_data: matchesData[0].my_shift_data,
        other_shift_data: matchesData[0].other_shift_data
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
    
    // Separate active and past matches
    const activeMatches = formattedMatches.filter((match: SwapMatch) => 
      match.status === 'pending' || match.status === 'accepted'
    );
    
    const pastMatches = formattedMatches.filter((match: SwapMatch) => 
      match.status === 'completed'
    );
    
    console.log(`Processed ${activeMatches.length} active matches and ${pastMatches.length} past matches`);
    
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
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error in acceptSwapMatch:', error);
    throw error;
  }
};

export const completeSwapMatch = async (matchId: string) => {
  console.log('Completing swap match:', matchId);
  
  try {
    const { data, error } = await supabase.functions.invoke('complete_swap_match', {
      body: { match_id: matchId }
    });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error in completeSwapMatch:', error);
    throw error;
  }
};
