
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateUtils';
import { isMutualDateSwap } from '@/utils/swap-matching/mutual-date-matcher';

/**
 * Check if two swap requests are compatible.
 * Step 1: Implement strict validation of dates - ensuring mutual swap dates match.
 */
export const checkMatchCompatibility = (
  request: any,
  requestShift: any,
  otherRequest: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
) => {
  console.log(`----- COMPATIBILITY CHECK START -----`);
  console.log(`Request 1 ID: ${request.id.substring(0, 6)}, User: ${request.requester_id.substring(0, 6)}`);
  console.log(`Request 2 ID: ${otherRequest.id.substring(0, 6)}, User: ${otherRequest.requester_id.substring(0, 6)}`);
  
  // Create a simplified shifts map for the mutual date swap check
  const shiftsMap = {
    [request.requester_shift_id]: requestShift,
    [otherRequest.requester_shift_id]: otherRequestShift
  };
  
  // Check for mutual date swap using our utility function
  const isMutualSwap = isMutualDateSwap(request, otherRequest, shiftsMap, preferredDatesByRequest);
  
  if (isMutualSwap) {
    console.log(`✓ MATCH FOUND based on mutual dates!`);
    console.log(`----- COMPATIBILITY CHECK COMPLETE -----`);
    return { 
      isCompatible: true, 
      reason: 'Mutual swap dates match' 
    };
  }
  
  console.log(`❌ Mutual dates check failed: Users don't want each other's dates`);
  console.log(`----- COMPATIBILITY CHECK COMPLETE -----`);
  
  return { 
    isCompatible: false, 
    reason: 'Users do not want each other\'s dates'
  };
};

/**
 * Log info about the match for debugging
 */
export const logMatchInfo = (
  request: any,
  otherRequest: any,
  myShift: any,
  theirShift: any,
  isMatch: boolean,
  reason: string
) => {
  if (isMatch) {
    console.log(`✅ MATCH FOUND: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  My shift: ${myShift?.normalizedDate || myShift?.date} (${myShift?.type}) <-> Their shift: ${theirShift?.normalizedDate || theirShift?.date} (${theirShift?.type})`);
    console.log(`  Reason: ${reason}`);
  } else {
    console.log(`❌ NO MATCH: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  Reason: ${reason}`);
  }
};
