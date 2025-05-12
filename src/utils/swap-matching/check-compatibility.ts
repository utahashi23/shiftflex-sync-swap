
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
  console.log(`----- COMPATIBILITY CHECK -----`);
  console.log(`Request ${request.id.substring(0, 6)} shift: ${requestShift.normalizedDate} (${requestShift.type})`);
  console.log(`Request ${otherRequest.id.substring(0, 6)} shift: ${otherRequestShift.normalizedDate} (${otherRequestShift.type})`);
  
  // Check if the first user wants the second user's shift date and type
  const prefDates = preferredDatesByRequest[request.id] || [];
  console.log(`User ${request.requester_id.substring(0, 6)} has ${prefDates.length} preferred dates`);
  
  // Find the exact matching preferred date
  const matchingPrefDate = prefDates.find(prefDate => prefDate.date === otherRequestShift.normalizedDate);
  
  if (!matchingPrefDate) {
    console.log(`User ${request.requester_id.substring(0, 6)} doesn't have a preferred date for ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't want date ${otherRequestShift.normalizedDate}` 
    };
  }
  
  console.log(`User ${request.requester_id.substring(0, 6)} wants date ${otherRequestShift.normalizedDate}`);
  
  // STRICT CHECK: Must have explicitly accepted types, and must include this shift type
  if (!matchingPrefDate.acceptedTypes || !Array.isArray(matchingPrefDate.acceptedTypes) || matchingPrefDate.acceptedTypes.length === 0) {
    console.log(`User ${request.requester_id.substring(0, 6)} didn't specify valid acceptable shift types, considering as not acceptable`);
    return {
      isCompatible: false,
      reason: `User ${request.requester_id.substring(0, 6)} didn't specify valid acceptable shift types for ${otherRequestShift.normalizedDate}`
    };
  }
  
  console.log(`User ${request.requester_id.substring(0, 6)} accepted types:`, matchingPrefDate.acceptedTypes);
  const firstUserWantsSecondType = matchingPrefDate.acceptedTypes.includes(otherRequestShift.type);
  
  if (!firstUserWantsSecondType) {
    console.log(`User ${request.requester_id.substring(0, 6)} doesn't want shift type ${otherRequestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't want shift type ${otherRequestShift.type}` 
    };
  }
  
  console.log(`User ${request.requester_id.substring(0, 6)} wants shift type ${otherRequestShift.type}`);
  
  // Check if the second user wants the first user's shift date and type
  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
  console.log(`User ${otherRequest.requester_id.substring(0, 6)} has ${otherPrefDates.length} preferred dates`);
  
  // Find the exact matching preferred date
  const matchingOtherPrefDate = otherPrefDates.find(prefDate => prefDate.date === requestShift.normalizedDate);
  
  if (!matchingOtherPrefDate) {
    console.log(`User ${otherRequest.requester_id.substring(0, 6)} doesn't have a preferred date for ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't want date ${requestShift.normalizedDate}` 
    };
  }
  
  console.log(`User ${otherRequest.requester_id.substring(0, 6)} wants date ${requestShift.normalizedDate}`);
  
  // STRICT CHECK: Must have explicitly accepted types, and must include this shift type
  if (!matchingOtherPrefDate.acceptedTypes || !Array.isArray(matchingOtherPrefDate.acceptedTypes) || matchingOtherPrefDate.acceptedTypes.length === 0) {
    console.log(`User ${otherRequest.requester_id.substring(0, 6)} didn't specify valid acceptable shift types, considering as not acceptable`);
    return {
      isCompatible: false,
      reason: `User ${otherRequest.requester_id.substring(0, 6)} didn't specify valid acceptable shift types for ${requestShift.normalizedDate}`
    };
  }
  
  console.log(`User ${otherRequest.requester_id.substring(0, 6)} accepted types:`, matchingOtherPrefDate.acceptedTypes);
  const secondUserWantsFirstType = matchingOtherPrefDate.acceptedTypes.includes(requestShift.type);
  
  if (!secondUserWantsFirstType) {
    console.log(`User ${otherRequest.requester_id.substring(0, 6)} doesn't want shift type ${requestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't want shift type ${requestShift.type}` 
    };
  }
  
  console.log(`User ${otherRequest.requester_id.substring(0, 6)} wants shift type ${requestShift.type}`);
  
  // Check if either user is already rostered on the swap date
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    console.log(`User ${request.requester_id.substring(0, 6)} already has a shift on ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} already has a shift on ${otherRequestShift.normalizedDate}` 
    };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`User ${otherRequest.requester_id.substring(0, 6)} already has a shift on ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} already has a shift on ${requestShift.normalizedDate}` 
    };
  }
  
  // We have a match!
  console.log(`🎉 MATCH FOUND between requests ${request.id.substring(0, 6)} and ${otherRequest.id.substring(0, 6)}`);
  console.log(`User ${request.requester_id.substring(0, 6)} wants to swap with User ${otherRequest.requester_id.substring(0, 6)}`);
  
  return { isCompatible: true, reason: 'Match found' };
};
