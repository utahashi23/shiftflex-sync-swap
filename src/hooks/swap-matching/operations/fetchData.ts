
import { supabase } from '@/integrations/supabase/client';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Fetch all necessary data for swap matching
 */
export const fetchAllData = async () => {
  try {
    // Fetch all shifts using our improved RLS bypass method
    console.log('Fetching all shifts...');
    const shiftsResult = await fetchAllShifts();
    if (shiftsResult.error) {
      console.error('Error fetching shifts:', shiftsResult.error);
      throw shiftsResult.error;
    }
    const allShifts = shiftsResult.data || [];
    console.log(`Fetched ${allShifts.length} shifts in total`);
    
    // Fetch all swap requests using our improved RLS bypass method
    console.log('Fetching all swap requests...');
    const requestsResult = await fetchAllSwapRequests();
    if (requestsResult.error) {
      console.error('Error fetching swap requests:', requestsResult.error);
      throw requestsResult.error;
    }
    const allRequests = requestsResult.data || [];
    console.log(`Fetched ${allRequests.length} swap requests in total`);
    
    // Fetch all preferred dates using our improved RLS bypass method
    console.log('Fetching all preferred dates...');
    const datesResult = await fetchAllPreferredDates();
    if (datesResult.error) {
      console.error('Error fetching preferred dates:', datesResult.error);
      throw datesResult.error;
    }
    const preferredDates = datesResult.data || [];
    console.log(`Fetched ${preferredDates.length} preferred dates in total`);
    
    // Basic validation of fetched data
    if (allRequests.length === 0) {
      return { success: false, message: "No pending swap requests found in the system" };
    }
    
    if (preferredDates.length === 0) {
      return { success: false, message: "No preferred dates found in the system" };
    }
    
    // Get profiles for all users with improved error handling
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    // Create a map of user IDs to profile info for quick lookup
    const profilesMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    // Combine shifts from both sources, ensuring no duplicates
    const shiftMap = new Map();
    allShifts.forEach(shift => {
      // Add normalized date and type for consistency
      shiftMap.set(shift.id, {
        ...shift,
        normalizedDate: new Date(shift.date).toISOString().split('T')[0],
        type: getShiftType(shift.start_time)
      });
    });
    
    // Add any embedded shifts from requests that might not be in the shifts table
    allRequests.forEach(request => {
      if (request._embedded_shift && request._embedded_shift.id) {
        const embeddedShift = request._embedded_shift;
        // Only add if not already present, or update with more complete data
        if (!shiftMap.has(embeddedShift.id)) {
          shiftMap.set(embeddedShift.id, {
            ...embeddedShift,
            normalizedDate: new Date(embeddedShift.date).toISOString().split('T')[0],
            type: getShiftType(embeddedShift.start_time)
          });
        }
      }
    });
    
    const combinedShifts = Array.from(shiftMap.values());
    console.log(`Combined ${combinedShifts.length} shifts after processing`);
    
    return { 
      success: true, 
      allShifts: combinedShifts, 
      allRequests, 
      preferredDates, 
      profilesMap 
    };
  } catch (error: any) {
    console.error('Error fetching data for swap matching:', error);
    return { success: false, message: error.message, error };
  }
};
