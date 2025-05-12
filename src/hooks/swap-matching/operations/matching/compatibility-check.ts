
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
  
  // Check if the first user wants the second user's shift date and type
  let firstUserWantsSecondDate = false;
  let firstUserWantsSecondType = false;
  const prefDates = preferredDatesByRequest[request.id] || [];
  
  for (const prefDate of prefDates) {
    if (prefDate.date === otherRequestShift.normalizedDate) {
      firstUserWantsSecondDate = true;
      console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
      
      // Debugging - log the accepted types and the shift type we're checking against
      console.log(`User ${request.requester_id} accepted types:`, prefDate.accepted_types);
      console.log(`Checking against shift type: ${otherRequestShift.type}`);
      
      if (!prefDate.accepted_types || prefDate.accepted_types.length === 0 || 
          prefDate.accepted_types.includes(otherRequestShift.type)) {
        firstUserWantsSecondType = true;
        console.log(`User ${request.requester_id} wants shift type ${otherRequestShift.type}`);
      } else {
        console.log(`User ${request.requester_id} doesn't want shift type ${otherRequestShift.type}`);
      }
      break;
    }
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} doesn't want the other shift`
    };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  for (const prefDate of otherPrefDates) {
    if (prefDate.date === requestShift.normalizedDate) {
      secondUserWantsFirstDate = true;
      console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
      
      // Debugging - log the accepted types and the shift type we're checking against
      console.log(`User ${otherRequest.requester_id} accepted types:`, prefDate.accepted_types);
      console.log(`Checking against shift type: ${requestShift.type}`);
      
      if (!prefDate.accepted_types || prefDate.accepted_types.length === 0 || 
          prefDate.accepted_types.includes(requestShift.type)) {
        secondUserWantsFirstType = true;
        console.log(`User ${otherRequest.requester_id} wants shift type ${requestShift.type}`);
      } else {
        console.log(`User ${otherRequest.requester_id} doesn't want shift type ${requestShift.type}`);
      }
      break;
    }
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id} doesn't want the other shift`
    };
  }
  
  // Check if either user is already rostered on the swap date
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`
    };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
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
  }
};
