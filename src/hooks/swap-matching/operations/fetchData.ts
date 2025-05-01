
import { supabase } from '@/integrations/supabase/client';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';
import { getShiftType } from '@/utils/shiftUtils';

/**
 * Fetch all necessary data for swap matching
 */
export const fetchAllData = async () => {
  try {
    // Fetch all shifts
    console.log('Fetching all shifts...');
    const shiftsResult = await fetchAllShifts();
    if (shiftsResult.error) {
      throw shiftsResult.error;
    }
    const allShifts = shiftsResult.data || [];
    console.log(`Fetched ${allShifts.length} shifts in total`);
    
    // Fetch all swap requests
    console.log('Fetching all swap requests...');
    const requestsResult = await fetchAllSwapRequests();
    if (requestsResult.error) {
      throw requestsResult.error;
    }
    const allRequests = requestsResult.data || [];
    console.log(`Fetched ${allRequests.length} swap requests in total`);
    
    // Fetch all preferred dates
    console.log('Fetching all preferred dates...');
    const datesResult = await fetchAllPreferredDates();
    if (datesResult.error) {
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
    
    // Get profiles for all users
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
    
    // Add any embedded shifts from the request data
    const shiftMap = new Map();
    allShifts.forEach(shift => {
      shiftMap.set(shift.id, shift);
    });
    
    allRequests.forEach(request => {
      if (request._embedded_shift && request._embedded_shift.id) {
        shiftMap.set(request._embedded_shift.id, request._embedded_shift);
      }
    });
    
    const combinedShifts = Array.from(shiftMap.values());
    console.log(`Combined ${combinedShifts.length} shifts after adding embedded shift data`);
    
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
