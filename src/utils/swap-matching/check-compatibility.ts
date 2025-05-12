
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
  
  for (const prefDate of prefDates) {
    if (prefDate.date === otherRequestShift.normalizedDate) {
      firstUserWantsSecondDate = true;
      console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
      
      // Check if user accepts this shift type - explicitly log for debugging
      console.log(`User ${request.requester_id} acceptable types:`, prefDate.accepted_types);
      console.log(`Other shift type: ${otherRequestShift.type}`);
      
      // Only consider it a match if the user explicitly accepts this shift type
      // If accepted_types is empty, it means no types were selected (the user didn't specify)
      if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
        firstUserWantsSecondType = prefDate.accepted_types.includes(otherRequestShift.type);
        console.log(`User ${request.requester_id} ${firstUserWantsSecondType ? 'wants' : 'doesn\'t want'} shift type ${otherRequestShift.type}`);
      } else {
        // If no types specified, we'll consider it as not acceptable
        firstUserWantsSecondType = false;
        console.log(`User ${request.requester_id} didn't specify acceptable shift types, considering as not acceptable`);
      }
      break;
    }
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id} doesn't want the other shift or its type`
    };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  console.log(`Checking if user ${otherRequest.requester_id} wants date ${requestShift.normalizedDate} with type ${requestShift.type}`);
  console.log(`User ${otherRequest.requester_id} has ${otherPrefDates.length} preferred dates`);
  
  for (const prefDate of otherPrefDates) {
    if (prefDate.date === requestShift.normalizedDate) {
      secondUserWantsFirstDate = true;
      console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
      
      // Check if user accepts this shift type - explicitly log for debugging
      console.log(`User ${otherRequest.requester_id} acceptable types:`, prefDate.accepted_types);
      console.log(`First shift type: ${requestShift.type}`);
      
      // Only consider it a match if the user explicitly accepts this shift type
      // If accepted_types is empty, it means no types were selected (the user didn't specify)
      if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
        secondUserWantsFirstType = prefDate.accepted_types.includes(requestShift.type);
        console.log(`User ${otherRequest.requester_id} ${secondUserWantsFirstType ? 'wants' : 'doesn\'t want'} shift type ${requestShift.type}`);
      } else {
        // If no types specified, we'll consider it as not acceptable
        secondUserWantsFirstType = false;
        console.log(`User ${otherRequest.requester_id} didn't specify acceptable shift types, considering as not acceptable`);
      }
      break;
    }
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id} doesn't want the other shift or its type`
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
