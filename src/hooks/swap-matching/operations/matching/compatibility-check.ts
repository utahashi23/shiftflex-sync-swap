
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateUtils';

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
  
  // Normalize shift dates to ensure consistent comparison
  const shift1NormalizedDate = requestShift.normalizedDate || normalizeDate(requestShift.date);
  const shift2NormalizedDate = otherRequestShift.normalizedDate || normalizeDate(otherRequestShift.date);
  
  console.log(`Shift 1: ${shift1NormalizedDate} (${requestShift.type || 'unknown type'})`);
  console.log(`Shift 2: ${shift2NormalizedDate} (${otherRequestShift.type || 'unknown type'})`);
  
  // STEP 1: Check for mutual swap dates
  // User A wants User B's date and vice versa
  
  // Get preferred dates for both users
  const user1PreferredDates = preferredDatesByRequest[request.id] || [];
  const user2PreferredDates = preferredDatesByRequest[otherRequest.id] || [];
  
  console.log(`User 1 has ${user1PreferredDates.length} preferred dates`);
  console.log(`User 2 has ${user2PreferredDates.length} preferred dates`);
  
  // Log the actual preferred dates for debugging
  if (user1PreferredDates.length > 0) {
    console.log('User 1 preferred dates:', user1PreferredDates.map(pd => {
      const normalized = normalizeDate(pd.date);
      return {
        original: pd.date,
        normalizedDate: normalized,
        matchesShift2: normalized === shift2NormalizedDate
      };
    }));
  }
  
  if (user2PreferredDates.length > 0) {
    console.log('User 2 preferred dates:', user2PreferredDates.map(pd => {
      const normalized = normalizeDate(pd.date);
      return {
        original: pd.date,
        normalizedDate: normalized,
        matchesShift1: normalized === shift1NormalizedDate
      };
    }));
  }
  
  // Log the shifts that need to match
  console.log('Shift 1 date we need to match:', {
    original: requestShift.date,
    normalized: shift1NormalizedDate
  });
  
  console.log('Shift 2 date we need to match:', {
    original: otherRequestShift.date,
    normalized: shift2NormalizedDate
  });
  
  // CRITICAL: Check if User A wants User B's date
  const user1WantsUser2Date = user1PreferredDates.some(pd => {
    const pdNormalizedDate = normalizeDate(pd.date);
    const matches = pdNormalizedDate === shift2NormalizedDate;
    console.log(`Comparing User 1 preferred date ${pdNormalizedDate} with Shift 2 date ${shift2NormalizedDate}: ${matches}`);
    return matches;
  });
  
  // CRITICAL: Check if User B wants User A's date
  const user2WantsUser1Date = user2PreferredDates.some(pd => {
    const pdNormalizedDate = normalizeDate(pd.date);
    const matches = pdNormalizedDate === shift1NormalizedDate;
    console.log(`Comparing User 2 preferred date ${pdNormalizedDate} with Shift 1 date ${shift1NormalizedDate}: ${matches}`);
    return matches;
  });
  
  console.log(`User 1 wants User 2's date (${shift2NormalizedDate}): ${user1WantsUser2Date}`);
  console.log(`User 2 wants User 1's date (${shift1NormalizedDate}): ${user2WantsUser1Date}`);
  
  // If mutual swap dates don't match, return incompatible
  if (!user1WantsUser2Date || !user2WantsUser1Date) {
    console.log(`❌ Mutual dates check failed: Users don't want each other's dates`);
    return { 
      isCompatible: false, 
      reason: !user1WantsUser2Date 
        ? `User ${request.requester_id.substring(0, 6)} doesn't want date ${shift2NormalizedDate}`
        : `User ${otherRequest.requester_id.substring(0, 6)} doesn't want date ${shift1NormalizedDate}`
    };
  }
  
  console.log(`✓ Mutual dates check passed - Users want each other's dates`);
  console.log(`✓ MATCH FOUND based on mutual dates!`);
  console.log(`----- COMPATIBILITY CHECK COMPLETE -----`);
  
  // For now, we're only implementing the mutual swap dates check
  // We'll add the other checks (shift types, preferences) in future improvements
  return { 
    isCompatible: true, 
    reason: 'Mutual swap dates match' 
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
