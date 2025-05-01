
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../use-toast';
import { formatSwapMatches } from './utils';
import { SwapMatch } from './types';

export const fetchUserMatches = async (userId: string) => {
  console.log('Fetching matches for user:', userId);
  
  const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
    body: { user_id: userId }
  });
  
  if (matchesError) throw matchesError;
  
  console.log('Raw match data from function:', matchesData);
  
  if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
    console.log('No matches found');
    return {
      matches: [],
      pastMatches: [],
      rawApiData: matchesData
    };
  }
  
  const formattedMatches = formatSwapMatches(matchesData);
  
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
};

export const acceptSwapMatch = async (matchId: string) => {
  console.log('Accepting swap match:', matchId);
  
  const { data, error } = await supabase.functions.invoke('accept_swap_match', {
    body: { match_id: matchId }
  });
  
  if (error) throw error;
  
  return data;
};

export const completeSwapMatch = async (matchId: string) => {
  console.log('Completing swap match:', matchId);
  
  const { data, error } = await supabase.functions.invoke('complete_swap_match', {
    body: { match_id: matchId }
  });
  
  if (error) throw error;
  
  return data;
};
