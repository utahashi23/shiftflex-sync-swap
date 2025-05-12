
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Check if users want to swap shifts based on their preferences
 * Implements strict validation of dates and shift types
 */
export const checkSwapCompatibility = (
  request: any,
  otherRequest: any,
  requestShift: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
) => {
  console.log(`----- COMPATIBILITY CHECK START -----`);
  console.log(`Checking compatibility between requests ${request.id.substring(0, 6)} and ${otherRequest.id.substring(0, 6)}`);
  console.log(`Request 1: Shift date ${requestShift.normalizedDate} (${requestShift.type})`);
  console.log(`Request 2: Shift date ${otherRequestShift.normalizedDate} (${otherRequestShift.type})`);
  
  // Get preferred dates for first user
  const user1PreferredDates = preferredDatesByRequest[request.id] || [];
  console.log(`User 1 (${request.requester_id.substring(0, 6)}) has ${user1PreferredDates.length} preferred dates`);
  
  // Check if first user wants second user's date
  const user1WantsDate = user1PreferredDates.find(pd => pd.date === otherRequestShift.normalizedDate);
  
  if (!user1WantsDate) {
    console.log(`❌ User 1 doesn't want date ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't want date ${otherRequestShift.normalizedDate}` 
    };
  }
  
  console.log(`✓ User 1 wants date ${otherRequestShift.normalizedDate}`);
  
  // STRICT CHECK: User 1 must have specified accepted types for the date
  if (!user1WantsDate.acceptedTypes || !Array.isArray(user1WantsDate.acceptedTypes) || user1WantsDate.acceptedTypes.length === 0) {
    console.log(`❌ User 1 hasn't specified any accepted shift types for date ${otherRequestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} hasn't specified any acceptable shift types` 
    };
  }
  
  console.log(`User 1 accepted types for that date: [${user1WantsDate.acceptedTypes.join(', ')}]`);
  
  // Check if User 1 accepts User 2's shift type
  if (!user1WantsDate.acceptedTypes.includes(otherRequestShift.type)) {
    console.log(`❌ User 1 doesn't accept shift type ${otherRequestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${request.requester_id.substring(0, 6)} doesn't accept shift type ${otherRequestShift.type}` 
    };
  }
  
  console.log(`✓ User 1 accepts shift type ${otherRequestShift.type}`);
  
  // Get preferred dates for second user
  const user2PreferredDates = preferredDatesByRequest[otherRequest.id] || [];
  console.log(`User 2 (${otherRequest.requester_id.substring(0, 6)}) has ${user2PreferredDates.length} preferred dates`);
  
  // Check if second user wants first user's date
  const user2WantsDate = user2PreferredDates.find(pd => pd.date === requestShift.normalizedDate);
  
  if (!user2WantsDate) {
    console.log(`❌ User 2 doesn't want date ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't want date ${requestShift.normalizedDate}` 
    };
  }
  
  console.log(`✓ User 2 wants date ${requestShift.normalizedDate}`);
  
  // STRICT CHECK: User 2 must have specified accepted types for the date
  if (!user2WantsDate.acceptedTypes || !Array.isArray(user2WantsDate.acceptedTypes) || user2WantsDate.acceptedTypes.length === 0) {
    console.log(`❌ User 2 hasn't specified any accepted shift types for date ${requestShift.normalizedDate}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} hasn't specified any acceptable shift types` 
    };
  }
  
  console.log(`User 2 accepted types for that date: [${user2WantsDate.acceptedTypes.join(', ')}]`);
  
  // Check if User 2 accepts User 1's shift type
  if (!user2WantsDate.acceptedTypes.includes(requestShift.type)) {
    console.log(`❌ User 2 doesn't accept shift type ${requestShift.type}`);
    return { 
      isCompatible: false, 
      reason: `User ${otherRequest.requester_id.substring(0, 6)} doesn't accept shift type ${requestShift.type}` 
    };
  }
  
  console.log(`✓ User 2 accepts shift type ${requestShift.type}`);
  
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
  console.log(`🎉 MATCH FOUND! All compatibility checks passed`);
  console.log(`----- COMPATIBILITY CHECK END -----`);
  
  return { 
    isCompatible: true, 
    reason: 'All compatibility criteria met' 
  };
};
