
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
  
  for (const prefDate of prefDates) {
    if (prefDate.date === otherRequestShift.normalizedDate) {
      firstUserWantsSecondDate = true;
      console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
      
      if (prefDate.accepted_types.length === 0 || prefDate.accepted_types.includes(otherRequestShift.type)) {
        firstUserWantsSecondType = true;
        console.log(`User ${request.requester_id} wants shift type ${otherRequestShift.type}`);
      } else {
        console.log(`User ${request.requester_id} doesn't want shift type ${otherRequestShift.type}`);
      }
      break;
    }
  }
  
  if (!firstUserWantsSecondDate || !firstUserWantsSecondType) {
    console.log(`No match: User ${request.requester_id} doesn't want the other shift`);
    return { isCompatible: false, reason: `User ${request.requester_id} doesn't want the other shift` };
  }
  
  // Check if the second user wants the first user's shift date and type
  let secondUserWantsFirstDate = false;
  let secondUserWantsFirstType = false;
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  
  for (const prefDate of otherPrefDates) {
    if (prefDate.date === requestShift.normalizedDate) {
      secondUserWantsFirstDate = true;
      console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
      
      if (prefDate.accepted_types.length === 0 || prefDate.accepted_types.includes(requestShift.type)) {
        secondUserWantsFirstType = true;
        console.log(`User ${otherRequest.requester_id} wants shift type ${requestShift.type}`);
      } else {
        console.log(`User ${otherRequest.requester_id} doesn't want shift type ${requestShift.type}`);
      }
      break;
    }
  }
  
  if (!secondUserWantsFirstDate || !secondUserWantsFirstType) {
    console.log(`No match: User ${otherRequest.requester_id} doesn't want the other shift`);
    return { isCompatible: false, reason: `User ${otherRequest.requester_id} doesn't want the other shift` };
  }
  
  // Check if either user is already rostered on the swap date
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    console.log(`User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`);
    return { isCompatible: false, reason: `User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}` };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}`);
    return { isCompatible: false, reason: `User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}` };
  }
  
  // We have a match!
  console.log(`🎉 MATCH FOUND between requests ${request.id} and ${otherRequest.id}`);
  console.log(`User ${request.requester_id} wants to swap with User ${otherRequest.requester_id}`);
  
  return { isCompatible: true, reason: 'Match found' };
};
