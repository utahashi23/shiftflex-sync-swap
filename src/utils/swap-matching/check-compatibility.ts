
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Check if users want to swap shifts based on their preferences
 */
export const checkSwapCompatibility = (
  request: any,
  otherRequest: any,
  requestShift: any,
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
  
  const matchingPrefDate = prefDates.find(prefDate => prefDate.date === otherRequestShift.normalizedDate);
  
  if (matchingPrefDate) {
    firstUserWantsSecondDate = true;
    console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
    
    // STRICT CHECK: Only consider it a match if the user explicitly accepts this shift type
    if (matchingPrefDate.acceptedTypes && Array.isArray(matchingPrefDate.acceptedTypes) && matchingPrefDate.acceptedTypes.length > 0) {
      console.log(`User ${request.requester_id} accepted types:`, matchingPrefDate.acceptedTypes);
      firstUserWantsSecondType = matchingPrefDate.acceptedTypes.includes(otherRequestShift.type);
      console.log(`User ${request.requester_id} ${firstUserWantsSecondType ? 'wants' : 'doesn\'t want'} shift type ${otherRequestShift.type}`);
    } else {
      // If no types specified or invalid format, consider it as not acceptable
      console.log(`User ${request.requester_id} didn't specify valid acceptable shift types, considering as not acceptable`);
      firstUserWantsSecondType = false;
    }
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
  
  const matchingOtherPrefDate = otherPrefDates.find(prefDate => prefDate.date === requestShift.normalizedDate);
  
  if (matchingOtherPrefDate) {
    secondUserWantsFirstDate = true;
    console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
    
    // STRICT CHECK: Only consider it a match if the user explicitly accepts this shift type
    if (matchingOtherPrefDate.acceptedTypes && Array.isArray(matchingOtherPrefDate.acceptedTypes) && matchingOtherPrefDate.acceptedTypes.length > 0) {
      console.log(`User ${otherRequest.requester_id} accepted types:`, matchingOtherPrefDate.acceptedTypes);
      secondUserWantsFirstType = matchingOtherPrefDate.acceptedTypes.includes(requestShift.type);
      console.log(`User ${otherRequest.requester_id} ${secondUserWantsFirstType ? 'wants' : 'doesn\'t want'} shift type ${requestShift.type}`);
    } else {
      // If no types specified or invalid format, consider it as not acceptable
      console.log(`User ${otherRequest.requester_id} didn't specify valid acceptable shift types, considering as not acceptable`);
      secondUserWantsFirstType = false;
    }
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
    console.log(`User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`
    };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}`);
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
