import { supabase } from '@/integrations/supabase/client';

/**
 * Check if two shifts are compatible for swapping
 */
export const checkSwapCompatibility = (
  request1: any,
  request2: any,
  shift1: any,
  shift2: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
): { isCompatible: boolean; reason?: string } => {
  // 1. Check if the dates are mutually compatible
  // User A wants User B's date and User B wants User A's date
  if (!isMutuallyRequestedDates(shift1, shift2, preferredDatesByRequest, request1.id, request2.id)) {
    return {
      isCompatible: false,
      reason: "The dates are not mutually requested by both users"
    };
  }

  // 2. Check if the shift types are compatible
  if (!areShiftTypesCompatible(shift1.type, shift2.type, request1.requester_id, request2.requester_id)) {
    return {
      isCompatible: false,
      reason: "The shift types are not compatible with user preferences"
    };
  }
  
  // 3. Check if the areas match preferences
  if (!areAreasCompatible(shift1, shift2, request1.requester_id, request2.requester_id)) {
    return {
      isCompatible: false,
      reason: "The shift areas do not match user preferences"
    };
  }
  
  // If we made it here, the shifts are compatible
  return { isCompatible: true };
};

/**
 * Check if the dates are mutually requested by both users
 */
const isMutuallyRequestedDates = (
  shift1: any,
  shift2: any,
  preferredDatesByRequest: Record<string, any[]>,
  request1Id: string,
  request2Id: string
): boolean => {
  // Check if User A's preferred dates include User B's shift date
  const user1PreferredDates = preferredDatesByRequest[request1Id] || [];
  const user1WantsUser2Date = user1PreferredDates.some(pd => pd.date === shift2.date);

  // Check if User B's preferred dates include User A's shift date
  const user2PreferredDates = preferredDatesByRequest[request2Id] || [];
  const user2WantsUser1Date = user2PreferredDates.some(pd => pd.date === shift1.date);

  // Both conditions must be true
  return user1WantsUser2Date && user2WantsUser1Date;
};

/**
 * Check if the shift types are compatible with user preferences
 */
const areShiftTypesCompatible = async (
  shift1Type: string,
  shift2Type: string,
  user1Id: string,
  user2Id: string
): Promise<boolean> => {
  // Fetch preferences for both users
  const { data: preferences } = await supabase
    .from('shift_swap_preferences')
    .select('user_id, acceptable_shift_types')
    .in('user_id', [user1Id, user2Id]);
  
  if (!preferences || preferences.length < 2) {
    // Default to true if preferences not found
    return true;
  }
  
  // Find each user's preferences
  const user1Prefs = preferences.find(p => p.user_id === user1Id);
  const user2Prefs = preferences.find(p => p.user_id === user2Id);
  
  // Check if User A accepts User B's shift type
  // Check if User B accepts User A's shift type
  return (
    !user1Prefs || 
    !user1Prefs.acceptable_shift_types || 
    user1Prefs.acceptable_shift_types.includes(shift2Type)
  ) && (
    !user2Prefs || 
    !user2Prefs.acceptable_shift_types || 
    user2Prefs.acceptable_shift_types.includes(shift1Type)
  );
};

// Define an interface for the truck area response
interface TruckArea {
  truck_name: string;
  area_id: string | null;
}

/**
 * Check if the areas of the shifts match user preferences
 */
const areAreasCompatible = async (
  shift1: any,
  shift2: any,
  user1Id: string,
  user2Id: string
): Promise<boolean> => {
  // Get area information for both shifts
  try {
    // Check if truck names are valid
    if (!shift1.truck_name || !shift2.truck_name) {
      return true; // Skip area check if no truck names
    }
    
    // Call the Edge Function with proper typing
    const { data, error } = await supabase.functions.invoke<TruckArea[]>('get_truck_areas', {
      body: {
        truck_names: [shift1.truck_name, shift2.truck_name]
      }
    });
    
    if (error) {
      console.error("Error fetching truck areas:", error);
      return true; // Default to true if error occurs
    }
    
    // Handle null or empty data
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No area data found for trucks");
      return true;
    }
    
    // Find the area IDs for each shift with proper typing
    const shift1Area = data.find(a => a.truck_name === shift1.truck_name);
    const shift2Area = data.find(a => a.truck_name === shift2.truck_name);
    
    const shift1AreaId = shift1Area?.area_id || null;
    const shift2AreaId = shift2Area?.area_id || null;
    
    // Fetch preferences for both users
    const { data: preferences } = await supabase
      .from('shift_swap_preferences')
      .select('user_id, preferred_areas')
      .in('user_id', [user1Id, user2Id]);
    
    if (!preferences) {
      return true; // Default to true if preferences not found
    }
    
    // Find each user's preferences
    const user1Prefs = preferences.find(p => p.user_id === user1Id);
    const user2Prefs = preferences.find(p => p.user_id === user2Id);
    
    // Check if User A's preferred areas include User B's shift area
    // Check if User B's preferred areas include User A's shift area
    return (
      !shift2AreaId || 
      !user1Prefs || 
      !user1Prefs.preferred_areas || 
      user1Prefs.preferred_areas.includes(shift2AreaId)
    ) && (
      !shift1AreaId || 
      !user2Prefs || 
      !user2Prefs.preferred_areas || 
      user2Prefs.preferred_areas.includes(shift1AreaId)
    );
  } catch (error) {
    console.error("Error in areAreasCompatible:", error);
    return true; // Default to true on error
  }
};

/**
 * Record a shift match in the database
 */
export const recordShiftMatch = async (request1: any, request2: any, initiatorId: string | null = null) => {
  try {
    // Create a new match record
    const matchData = {
      requester_request_id: request1.id,
      acceptor_request_id: request2.id,
      requester_shift_id: request1.requester_shift_id,
      acceptor_shift_id: request2.requester_shift_id,
      match_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      requester_has_accepted: false,
      acceptor_has_accepted: false
    };
    
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .insert(matchData)
      .select();
    
    if (error) throw error;
    
    // Update the status of both requests to 'matched'
    await supabase
      .from('shift_swap_requests')
      .update({ status: 'matched' })
      .in('id', [request1.id, request2.id]);
    
    return { success: true, match: data[0] };
  } catch (error) {
    console.error('Error recording shift match:', error);
    return { success: false, error };
  }
};
