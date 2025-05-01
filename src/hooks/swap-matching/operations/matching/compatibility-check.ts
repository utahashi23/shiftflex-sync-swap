
import { checkSwapCompatibility } from '@/utils/swap-matching';
import { MatchEntry } from './types';

/**
 * Checks if two request shifts are compatible for swapping
 */
export const checkMatchCompatibility = (
  request: any,
  otherRequest: any,
  requestShift: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
): boolean => {
  if (!requestShift || !otherRequestShift) {
    console.log(`Missing shift data for one of the requests`);
    return false;
  }
  
  // Skip self-comparison
  if (request.id === otherRequest.id) return false;
  
  // Skip if requester is the same person
  if (request.requester_id === otherRequest.requester_id) return false;
  
  // Check if users want to swap shifts based on their preferences
  const { isCompatible } = checkSwapCompatibility(
    request,
    otherRequest,
    requestShift,
    otherRequestShift,
    preferredDatesByRequest,
    shiftsByUser
  );
  
  return isCompatible;
};

/**
 * Log information about a potential match
 */
export const logMatchInfo = (
  requesterName: string, 
  request: any, 
  requestShift: any
) => {
  console.log(`Processing request ${request.id} from user ${request.requester_id} (${requesterName || 'Unknown User'})`);
  console.log(`Shift date: ${requestShift?.normalizedDate}, type: ${requestShift?.type}`);
};
