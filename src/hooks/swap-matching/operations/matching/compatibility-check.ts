
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
  
  // Get preferred dates for first user
  const user1PreferredDates = preferredDatesByRequest[request.id] || [];
  
  // CRITICAL: Find exact matching preferred date with the proper date format
  const user1MatchingDate = user1PreferredDates.find(pd => pd.date === otherRequestShift.normalizedDate);
  
  if (!user1MatchingDate) {
    console.log(`❌ User 1 doesn't want date ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't want date ${otherRequestShift.normalizedDate}` 
    };
  }
  
  // STRICT CHECK: Verify user has specified accepted types for this date
  if (!user1MatchingDate.acceptedTypes || 
      !Array.isArray(user1MatchingDate.acceptedTypes) || 
      user1MatchingDate.acceptedTypes.length === 0) {
    console.log(`❌ User 1 hasn't specified any accepted types for date ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} hasn't specified any acceptable shift types` 
    };
  }
  
  console.log(`User 1 accepted types: [${user1MatchingDate.acceptedTypes.join(', ')}]`);
  
  // Check if User 1 accepts User 2's shift type
  if (!user1MatchingDate.acceptedTypes.includes(otherRequestShift.type)) {
    console.log(`❌ User 1 doesn't accept shift type ${otherRequestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't accept shift type ${otherRequestShift.type}` 
    };
  }
  
  console.log(`✓ User 1 accepts shift type ${otherRequestShift.type} for date ${otherRequestShift.normalizedDate}`);
  
  // Get preferred dates for second user
  const user2PreferredDates = preferredDatesByRequest[otherRequest.id] || [];
  
  // CRITICAL: Find exact matching preferred date with the proper date format
  const user2MatchingDate = user2PreferredDates.find(pd => pd.date === requestShift.normalizedDate);
  
  if (!user2MatchingDate) {
    console.log(`❌ User 2 doesn't want date ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't want date ${requestShift.normalizedDate}` 
    };
  }
  
  // STRICT CHECK: Verify user has specified accepted types for this date
  if (!user2MatchingDate.acceptedTypes || 
      !Array.isArray(user2MatchingDate.acceptedTypes) || 
      user2MatchingDate.acceptedTypes.length === 0) {
    console.log(`❌ User 2 hasn't specified any accepted types for date ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} hasn't specified any acceptable shift types` 
    };
  }
  
  console.log(`User 2 accepted types: [${user2MatchingDate.acceptedTypes.join(', ')}]`);
  
  // Check if User 2 accepts User 1's shift type
  if (!user2MatchingDate.acceptedTypes.includes(requestShift.type)) {
    console.log(`❌ User 2 doesn't accept shift type ${requestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't accept shift type ${requestShift.type}` 
    };
  }
  
  console.log(`✓ User 2 accepts shift type ${requestShift.type} for date ${requestShift.normalizedDate}`);
  
  // Check for schedule conflicts
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
