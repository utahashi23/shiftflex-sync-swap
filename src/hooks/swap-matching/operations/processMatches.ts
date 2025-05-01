
import { recordShiftMatch } from '@/utils/swap-matching';

/**
 * Process and record the found matches
 */
export const processMatches = async (matches: any[], userId: string) => {
  for (const match of matches) {
    await recordShiftMatch(match.request, match.otherRequest, userId);
  }
  return matches.length;
};
