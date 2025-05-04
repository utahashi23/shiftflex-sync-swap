
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Check if two swap requests are compatible
 */
export const checkMatchCompatibility = (
  request: any,
  requestShift: any,
  otherRequest: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
) => {
  console.log(`----- MATCHING CHECK DETAILS -----`);
  console.log(`Request ${request.id} shift: ${requestShift.normalizedDate} (${requestShift.type})`);
  console.log(`Request ${otherRequest.id} shift: ${otherRequestShift.normalizedDate} (${otherRequestShift.type})`);
  
  // Enhanced logging for debugging
  console.log(`Requester ${request.requester_id} wants to swap shift on ${requestShift.normalizedDate}`);
  console.log(`Other requester ${otherRequest.requester_id} wants to swap shift on ${otherRequestShift.normalizedDate}`);
  
  // Log preferred dates to help debug
  const prefDates = preferredDatesByRequest[request.id] || [];
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  console.log(`Requester preferred dates:`, prefDates);
  console.log(`Other requester preferred dates:`, otherPrefDates);
  
  // Check if the first user wants the second user's shift date and type
  let firstUserWantsSecondDate = false;
  let firstUserWantsSecondType = false;
  
  for (const prefDate of prefDates) {
    // Convert dates to strings for reliable comparison
    const prefDateStr = prefDate.date;
    const otherShiftDateStr = otherRequestShift.normalizedDate;
    
    console.log(`Comparing preferred date ${prefDateStr} with other shift date ${otherShiftDateStr}`);
    
    if (prefDateStr === otherShiftDateStr) {
      firstUserWantsSecondDate = true;
      console.log(`User ${request.requester_id} wants date ${otherShiftDateStr} ✓`);
      
      if (!prefDate.accepted_types || prefDate.accepted_types.length === 0 || 
          prefDate.accepted_types.includes(otherRequestShift.type)) {
        firstUserWantsSecondType = true;
        console.log(`User ${request.requester_id} wants shift type ${otherRequestShift.type} ✓`);
      } else {
        console.log(`User ${request.requester_id} doesn't want shift type ${otherRequestShift.type} ✗`);
      }
      break;
    }
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    console.log(`No match: User ${request.requester_id} doesn't want the other shift ✗`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} doesn't want the other shift`
    };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  
  for (const prefDate of otherPrefDates) {
    // Convert dates to strings for reliable comparison
    const prefDateStr = prefDate.date;
    const requestShiftDateStr = requestShift.normalizedDate;
    
    console.log(`Comparing other user's preferred date ${prefDateStr} with requester shift date ${requestShiftDateStr}`);
    
    if (prefDateStr === requestShiftDateStr) {
      secondUserWantsFirstDate = true;
      console.log(`User ${otherRequest.requester_id} wants date ${requestShiftDateStr} ✓`);
      
      if (!prefDate.accepted_types || prefDate.accepted_types.length === 0 || 
          prefDate.accepted_types.includes(requestShift.type)) {
        secondUserWantsFirstType = true;
        console.log(`User ${otherRequest.requester_id} wants shift type ${requestShift.type} ✓`);
      } else {
        console.log(`User ${otherRequest.requester_id} doesn't want shift type ${requestShift.type} ✗`);
      }
      break;
    }
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    console.log(`No match: User ${otherRequest.requester_id} doesn't want the other shift ✗`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id} doesn't want the other shift`
    };
  }
  
  // Additional check: verify both users are not already scheduled on the days they want to swap to
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    console.log(`User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate} ✗`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`
    };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate} ✗`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}`
    };
  }
  
  // We have a match!
  console.log(`🎉 MATCH FOUND between requests ${request.id} and ${otherRequest.id}`);
  console.log(`User ${request.requester_id} wants to swap with User ${otherRequest.requester_id}`);
  
  return { isCompatible: true, reason: 'Match found' };
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
  } else {
    console.log(`❌ NO MATCH: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  Reason: ${reason}`);
    
    // Additional debug info for failed matches
    const requestId = request.id;
    const otherRequestId = otherRequest.id;
    
    console.log(`  Details for request ${requestId.substring(0, 6)}:`);
    console.log(`    - Shift date: ${myShift?.normalizedDate || myShift?.date}`);
    console.log(`  Details for request ${otherRequestId.substring(0, 6)}:`);
    console.log(`    - Shift date: ${theirShift?.normalizedDate || theirShift?.date}`);
  }
};
