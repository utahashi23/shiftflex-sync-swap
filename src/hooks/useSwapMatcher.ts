
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeDate } from '@/utils/dateUtils';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Determines shift type based on start time
   */
  const getShiftType = (startTime: string): "day" | "afternoon" | "night" => {
    const startHour = new Date(`2000-01-01T${startTime}`).getHours();
    
    if (startHour <= 8) {
      return 'day';
    } else if (startHour > 8 && startHour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  /**
   * Find all potential matches between all pending swap requests
   */
  const findSwapMatches = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', user.id);
      
      // Step 1: Fetch ALL pending swap requests from ALL users
      console.log('Fetching ALL pending swap requests...');
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id, 
          requester_id, 
          requester_shift_id, 
          status, 
          preferred_dates_count
        `)
        .eq('status', 'pending')
        .gt('preferred_dates_count', 0); // Only include requests with at least one preferred date
        
      if (requestsError) throw requestsError;
      
      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allRequests.length} pending swap requests:`, allRequests);
      
      // Step 2: Get all requester profile information 
      const requesterIds = [...new Set(allRequests.map(req => req.requester_id))];
      console.log('Fetching profiles for requesters:', requesterIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', requesterIds);
        
      if (profilesError) throw profilesError;
      console.log('Fetched profiles:', profiles?.length || 0);
      
      // Create a map of user IDs to profile info for quick lookup
      const profilesMap = (profiles || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Step 3: Get all preferred dates
      const requestIds = allRequests.map(req => req.id);
      console.log('Fetching preferred dates...');
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (datesError) throw datesError;
      
      if (!preferredDates || preferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${preferredDates.length} preferred dates:`, preferredDates);
      
      // Step 4: Get ALL shifts for ALL users
      console.log('Fetching all shifts for all users...');
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('user_id', requesterIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!allShifts || allShifts.length === 0) {
        toast({
          title: "No shifts found",
          description: "No shifts found for requesters.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allShifts.length} shifts across all users:`, allShifts);
      
      // Step 5: Create lookup maps for more efficient matching
      const shiftsByDate = {};
      const shiftsByUser = {};
      const requestsByUser = {};
      const requestShifts = {}; // Map request's shift_id to shift details
      
      // Build shifts by date index
      allShifts.forEach(shift => {
        const normalizedDate = normalizeDate(shift.date);
        if (!shiftsByDate[normalizedDate]) {
          shiftsByDate[normalizedDate] = [];
        }
        shiftsByDate[normalizedDate].push({
          ...shift,
          type: getShiftType(shift.start_time)
        });
        
        // Group shifts by user
        if (!shiftsByUser[shift.user_id]) {
          shiftsByUser[shift.user_id] = [];
        }
        shiftsByUser[shift.user_id].push(normalizedDate);
      });
      
      // Group requests by user
      allRequests.forEach(req => {
        if (!requestsByUser[req.requester_id]) {
          requestsByUser[req.requester_id] = [];
        }
        requestsByUser[req.requester_id].push(req);
        
        // Find the shift associated with this request
        const requestShift = allShifts.find(s => s.id === req.requester_shift_id);
        if (requestShift) {
          requestShifts[req.id] = {
            ...requestShift,
            type: getShiftType(requestShift.start_time),
            normalizedDate: normalizeDate(requestShift.date)
          };
        }
      });
      
      // Group preferred dates by request
      const preferredDatesByRequest = {};
      preferredDates.forEach(pref => {
        if (!preferredDatesByRequest[pref.request_id]) {
          preferredDatesByRequest[pref.request_id] = [];
        }
        preferredDatesByRequest[pref.request_id].push({
          date: normalizeDate(pref.date),
          acceptedTypes: pref.accepted_types || []
        });
      });
      
      console.log('Data structures prepared for matching');
      
      // Step 6: Perform the matching
      let matchesFound = 0;
      const processedPairs = new Set(); // To avoid duplicate matches
      
      console.log('Starting to process each request for potential matches...');
      
      for (const request of allRequests) {
        // Get the request's shift details
        const requestShift = requestShifts[request.id];
        if (!requestShift) {
          console.warn(`Missing shift data for request ${request.id}`);
          continue;
        }
        
        // Get the requester's profile
        const requesterProfile = profilesMap[request.requester_id];
        console.log(`Processing request ${request.id} from user ${request.requester_id}`, requesterProfile ? `(${requesterProfile.first_name} ${requesterProfile.last_name})` : '');
        
        // Get preferred dates for this request
        const prefDates = preferredDatesByRequest[request.id] || [];
        if (prefDates.length === 0) {
          console.warn(`No preferred dates for request ${request.id}`);
          continue;
        }
        
        console.log(`Request ${request.id} has ${prefDates.length} preferred dates`);
        console.log(`Offering shift on ${requestShift.normalizedDate} (${requestShift.type})`);
        
        // For each other request, check if there's a potential match
        for (const otherRequest of allRequests) {
          // Skip if it's the same request
          if (otherRequest.id === request.id) continue;
          
          // Create a unique pair ID to avoid duplicate matches
          const pairId = [request.id, otherRequest.id].sort().join('-');
          if (processedPairs.has(pairId)) {
            continue;
          }
          processedPairs.add(pairId);
          
          // Get the other request's shift details
          const otherRequestShift = requestShifts[otherRequest.id];
          if (!otherRequestShift) {
            console.warn(`Missing shift data for other request ${otherRequest.id}`);
            continue;
          }
          
          // Get the other requester's profile
          const otherRequesterProfile = profilesMap[otherRequest.requester_id];
          console.log(`Checking against request ${otherRequest.id} from user ${otherRequest.requester_id}`, otherRequesterProfile ? `(${otherRequesterProfile.first_name} ${otherRequesterProfile.last_name})` : '');
          
          // Get preferred dates for the other request
          const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
          if (otherPrefDates.length === 0) {
            console.warn(`No preferred dates for other request ${otherRequest.id}`);
            continue;
          }
          
          // Check if the first user wants the second user's shift date
          let firstUserWantsSecondDate = false;
          let firstUserWantsSecondType = false;
          
          for (const prefDate of prefDates) {
            if (prefDate.date === otherRequestShift.normalizedDate) {
              firstUserWantsSecondDate = true;
              console.log(`User ${request.requester_id} wants date ${otherRequestShift.normalizedDate}`);
              
              if (prefDate.acceptedTypes.length === 0 || prefDate.acceptedTypes.includes(otherRequestShift.type)) {
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
            continue;
          }
          
          // Check if the second user wants the first user's shift date
          let secondUserWantsFirstDate = false;
          let secondUserWantsFirstType = false;
          
          for (const prefDate of otherPrefDates) {
            if (prefDate.date === requestShift.normalizedDate) {
              secondUserWantsFirstDate = true;
              console.log(`User ${otherRequest.requester_id} wants date ${requestShift.normalizedDate}`);
              
              if (prefDate.acceptedTypes.length === 0 || prefDate.acceptedTypes.includes(requestShift.type)) {
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
            continue;
          }
          
          // Check if either user is already rostered on the swap date
          const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(otherRequestShift.normalizedDate);
          if (user1HasConflict) {
            console.log(`User ${request.requester_id} already has a shift on ${otherRequestShift.normalizedDate}`);
            continue;
          }
          
          const user2HasConflict = (shiftsByUser[otherRequest.requester_id] || []).includes(requestShift.normalizedDate);
          if (user2HasConflict) {
            console.log(`User ${otherRequest.requester_id} already has a shift on ${requestShift.normalizedDate}`);
            continue;
          }
          
          // We have a match!
          console.log(`🎉 MATCH FOUND between requests ${request.id} and ${otherRequest.id}`);
          console.log(`User ${request.requester_id} wants to swap with User ${otherRequest.requester_id}`);
          
          try {
            // Record the match in the potential_matches table
            const { data: matchData, error: matchError } = await supabase
              .from('shift_swap_potential_matches')
              .insert({
                requester_request_id: request.id,
                acceptor_request_id: otherRequest.id,
                requester_shift_id: request.requester_shift_id,
                acceptor_shift_id: otherRequest.requester_shift_id,
                match_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();
              
            if (matchError) {
              console.error('Error recording match:', matchError);
              continue;
            }
            
            console.log('Match recorded:', matchData);
            
            // Update both requests to matched status
            const { error: error1 } = await supabase
              .from('shift_swap_requests')
              .update({
                status: 'matched',
                acceptor_id: otherRequest.requester_id,
                acceptor_shift_id: otherRequest.requester_shift_id
              })
              .eq('id', request.id);
              
            if (error1) {
              console.error('Error updating first request:', error1);
              continue;
            }
            
            const { error: error2 } = await supabase
              .from('shift_swap_requests')
              .update({
                status: 'matched',
                acceptor_id: request.requester_id,
                acceptor_shift_id: request.requester_shift_id
              })
              .eq('id', otherRequest.id);
              
            if (error2) {
              console.error('Error updating second request:', error2);
              continue;
            }
            
            matchesFound++;
            
            // Notify if the current user is involved
            if (request.requester_id === user.id || otherRequest.requester_id === user.id) {
              toast({
                title: "Match Found!",
                description: `Your shift swap request has been matched.`,
              });
            }
            
            // Only find one match per request
            break;
          } catch (error) {
            console.error('Error processing match:', error);
          }
        }
      }
      
      console.log(`Matching complete. Found ${matchesFound} matches.`);
      
      if (matchesFound === 0) {
        toast({
          title: "No matches found",
          description: "No suitable matches found between any of the swap requests.",
        });
      } else {
        toast({
          title: "Matching Complete",
          description: `Found ${matchesFound} swap matches.`,
        });
      }
      
    } catch (error: any) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error finding matches",
        description: error.message || "There was a problem finding swap matches.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log('----------- SWAP MATCHING COMPLETED -----------');
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
