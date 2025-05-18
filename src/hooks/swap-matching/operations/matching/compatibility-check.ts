
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Check if two swap requests are compatible.
 * Implements strict validation of dates and shift types.
 */
export const checkMatchCompatibility = (
  request: any,
  requestShift: any,
  otherRequest: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
) => {
  console.log(`----- CHECKING MATCH COMPATIBILITY -----`);
  console.log(`Request 1 ID: ${request.id.substring(0, 6)}, User: ${request.requester_id.substring(0, 6)}`);
  console.log(`Request 2 ID: ${otherRequest.id.substring(0, 6)}, User: ${otherRequest.requester_id.substring(0, 6)}`);
  console.log(`Shift 1: ${requestShift.normalizedDate} (${requestShift.type})`);
  console.log(`Shift 2: ${otherRequestShift.normalizedDate} (${otherRequestShift.type})`);
  
  // 1. Check for mutual swap dates
  // Get preferred dates for first user
  const user1PreferredDates = preferredDatesByRequest[request.id] || [];
  const user2PreferredDates = preferredDatesByRequest[otherRequest.id] || [];
  
  // CRITICAL: Find exact matching preferred date with the proper date format
  const user1WantsUser2Date = user1PreferredDates.some(pd => pd.date === otherRequestShift.normalizedDate);
  const user2WantsUser1Date = user2PreferredDates.some(pd => pd.date === requestShift.normalizedDate);
  
  if (!user1WantsUser2Date || !user2WantsUser1Date) {
    console.log(`❌ Mutual dates check failed: User1 wants User2 date: ${user1WantsUser2Date}, User2 wants User1 date: ${user2WantsUser1Date}`);
    return { 
      isCompatible: false, 
      reason: !user1WantsUser2Date 
        ? `User ${request.requester_id.substring(0, 6)} doesn't want date ${otherRequestShift.normalizedDate}`
        : `User ${otherRequest.requester_id.substring(0, 6)} doesn't want date ${requestShift.normalizedDate}`
    };
  }
  
  console.log(`✓ Mutual dates check passed`);
  
  // 2. Check accepted types match
  // Find the specific dates that each user requested
  const user1RequestedDate = user1PreferredDates.find(pd => pd.date === otherRequestShift.normalizedDate);
  const user2RequestedDate = user2PreferredDates.find(pd => pd.date === requestShift.normalizedDate);
  
  // Check that the users accept each other's shift types
  const user1AcceptsType = user1RequestedDate && 
                          Array.isArray(user1RequestedDate.acceptedTypes) && 
                          user1RequestedDate.acceptedTypes.includes(otherRequestShift.type);
                          
  const user2AcceptsType = user2RequestedDate && 
                          Array.isArray(user2RequestedDate.acceptedTypes) && 
                          user2RequestedDate.acceptedTypes.includes(requestShift.type);
  
  if (!user1AcceptsType || !user2AcceptsType) {
    console.log(`❌ Accepted types check failed: User1 accepts User2 type: ${user1AcceptsType}, User2 accepts User1 type: ${user2AcceptsType}`);
    return { 
      isCompatible: false, 
      reason: !user1AcceptsType
        ? `User ${request.requester_id.substring(0, 6)} doesn't accept shift type ${otherRequestShift.type}`
        : `User ${otherRequest.requester_id.substring(0, 6)} doesn't accept shift type ${requestShift.type}`
    };
  }
  
  console.log(`✓ Accepted types check passed`);
  
  // 3. Check for schedule conflicts
  const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
  if (user1HasConflict) {
    console.log(`❌ User 1 already has a shift on ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} already has a shift on ${otherRequestShift.normalizedDate}` 
    };
  }
  
  const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
  if (user2HasConflict) {
    console.log(`❌ User 2 already has a shift on ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} already has a shift on ${requestShift.normalizedDate}` 
    };
  }
  
  // All checks passed, we have a match!
  console.log(`🎉 MATCH FOUND: ${request.id.substring(0, 6)} <-> ${otherRequest.id.substring(0, 6)}`);
  console.log(`Both users want each other's dates and accept each other's shift types`);
  console.log(`----- COMPATIBILITY CHECK COMPLETE -----`);
  
  return { 
    isCompatible: true, 
    reason: 'All compatibility criteria met' 
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
  } else {
    console.log(`❌ NO MATCH: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  Reason: ${reason}`);
  }
};
