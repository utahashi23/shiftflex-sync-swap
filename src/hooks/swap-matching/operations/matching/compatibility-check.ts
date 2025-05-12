
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
  
  console.log(`Checking if user ${request.requester_id} wants date ${otherRequestShift.normalizedDate} with type ${otherRequestShift.type}`);
  console.log(`User ${request.requester_id} has ${prefDates.length} preferred dates`);
  
  // Find the exact matching preferred date
  const matchingPrefDate = prefDates.find(prefDate => prefDate.date === otherRequestShift.normalizedDate);
  
  if (matchingPrefDate) {
    firstUserWantsSecondDate = true;
    console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
    
    // STRICT CHECK: Must have explicitly accepted types, and must include this shift type
    console.log(`User ${request.requester_id} accepted types:`, matchingPrefDate.acceptedTypes);
    console.log(`Checking against shift type: ${otherRequestShift.type}`);
    
    if (matchingPrefDate.acceptedTypes && Array.isArray(matchingPrefDate.acceptedTypes) && matchingPrefDate.acceptedTypes.length > 0) {
      firstUserWantsSecondType = matchingPrefDate.acceptedTypes.includes(otherRequestShift.type);
      console.log(`User ${request.requester_id} ${firstUserWantsSecondType ? 'wants' : 'doesn\'t want'} shift type ${otherRequestShift.type}`);
    } else {
      // If no types specified or invalid format, consider it as not acceptable
      firstUserWantsSecondType = false;
      console.log(`User ${request.requester_id} didn't specify valid acceptable shift types, considering as not acceptable`);
    }
  } else {
    console.log(`User ${request.requester_id} doesn't have a preferred date for ${otherRequestShift.normalizedDate}`);
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} doesn't want the date or shift type ${otherRequestShift.type}`
    };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  console.log(`Checking if user ${otherRequest.requester_id} wants date ${requestShift.normalizedDate} with type ${requestShift.type}`);
  console.log(`User ${otherRequest.requester_id} has ${otherPrefDates.length} preferred dates`);
  
  // Find the exact matching preferred date
  const matchingOtherPrefDate = otherPrefDates.find(prefDate => prefDate.date === requestShift.normalizedDate);
  
  if (matchingOtherPrefDate) {
    secondUserWantsFirstDate = true;
    console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
    
    // STRICT CHECK: Must have explicitly accepted types, and must include this shift type
    console.log(`User ${otherRequest.requester_id} accepted types:`, matchingOtherPrefDate.acceptedTypes);
    console.log(`Checking against shift type: ${requestShift.type}`);
    
    if (matchingOtherPrefDate.acceptedTypes && Array.isArray(matchingOtherPrefDate.acceptedTypes) && matchingOtherPrefDate.acceptedTypes.length > 0) {
      secondUserWantsFirstType = matchingOtherPrefDate.acceptedTypes.includes(requestShift.type);
      console.log(`User ${otherRequest.requester_id} ${secondUserWantsFirstType ? 'wants' : 'doesn\'t want'} shift type ${requestShift.type}`);
    } else {
      // If no types specified or invalid format, consider it as not acceptable
      secondUserWantsFirstType = false;
      console.log(`User ${otherRequest.requester_id} didn't specify valid acceptable shift types, considering as not acceptable`);
    }
  } else {
    console.log(`User ${otherRequest.requester_id} doesn't have a preferred date for ${requestShift.normalizedDate}`);
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id} doesn't want the date or shift type ${requestShift.type}`
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
