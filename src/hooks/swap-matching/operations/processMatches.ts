
import { recordShiftMatch } from '@/utils/swap-matching';

/**
 * Process and record the found matches
 */
export const processMatches = async (matches: any[], userId: string) => {
  const results = [];
  
  for (const match of matches) {
    const result = await recordShiftMatch(match.request, match.otherRequest, userId);
    results.push(result);
  }
  
  return results;
};
