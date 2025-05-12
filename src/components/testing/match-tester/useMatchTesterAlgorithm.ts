
import { useState } from 'react';
import { MatchTestResult, SwapRequestWithDetails } from './types';
import { toast } from '@/hooks/use-toast';

export const useMatchTesterAlgorithm = (user: any) => {
  const [matchResults, setMatchResults] = useState<MatchTestResult[]>([]);
  
  const runSimpleMatch = (allRequests: SwapRequestWithDetails[], allPreferredDates: any[]) => {
    if (!allRequests || !allPreferredDates) {
      toast({
        title: "No data",
        description: "Please fetch data first",
        variant: "destructive"
      });
      return;
    }

    console.log("Running simple match with", allRequests.length, "requests and", allPreferredDates.length, "preferred dates");
    
    // Group preferred dates by request ID for faster lookups
    const preferredDatesByRequest: Record<string, any> = {};
    
    // Process preferred dates with accepted types
    allPreferredDates.forEach(date => {
      if (!preferredDatesByRequest[date.request_id]) {
        preferredDatesByRequest[date.request_id] = [];
      }
      
      preferredDatesByRequest[date.request_id].push({
        date: date.date,
        accepted_types: date.accepted_types || []
      });
    });

    console.log("Preferred dates grouped by request:", Object.keys(preferredDatesByRequest).length);
    
    // Log information about the current user's requests
    if (user) {
      const userRequests = allRequests.filter(r => r.requester_id === user.id);
      console.log(`User ${user.id} has ${userRequests.length} requests`);
      userRequests.forEach(req => {
        const preferredDatesWithTypes = preferredDatesByRequest[req.id]?.map((pd: any) => 
          `${pd.date} (types: ${pd.accepted_types?.join(', ') || 'any'})`
        ).join(', ');
        
        console.log(`- Request ${req.id}: shift date ${req.shift_date}, preferred dates: ${preferredDatesWithTypes || 'none'}`);
      });
    }

    // Copy the array to avoid modifying the original
    const pendingRequests = allRequests.filter(req => req.status === 'pending');
    
    // Calculate the potential matches
    const matches: MatchTestResult[] = [];
    const processedPairs = new Set<string>();

    // First pass: prioritize matches for the current user
    let userRequests = [];
    let otherRequests = [];

    if (user) {
      // If we have a logged in user, prioritize their matches
      userRequests = pendingRequests.filter(req => req.requester_id === user.id);
      otherRequests = pendingRequests.filter(req => req.requester_id !== user.id);
      
      console.log(`Found ${userRequests.length} pending requests for current user and ${otherRequests.length} for other users`);
    } else {
      // If no user is logged in, process all requests equally
      userRequests = pendingRequests;
      otherRequests = pendingRequests;
      console.log("No current user, processing all requests equally");
    }
    
    // Check matches for current user first if applicable
    if (userRequests.length > 0) {
      // For each of current user's requests, check against all other users' requests
      for (const userRequest of userRequests) {
        // The other requests to compare against can include all requests except the current one
        const requestsToCompare = pendingRequests.filter(r => 
          r.id !== userRequest.id && r.requester_id !== userRequest.requester_id
        );
        
        for (const otherRequest of requestsToCompare) {
          const matchKey = [userRequest.id, otherRequest.id].sort().join('_');
          if (processedPairs.has(matchKey)) continue;
          processedPairs.add(matchKey);
          
          const userShiftDate = userRequest.shift_date;
          const otherShiftDate = otherRequest.shift_date;
          
          if (!userShiftDate || !otherShiftDate || 
              userShiftDate === 'Unknown' || otherShiftDate === 'Unknown') {
            continue;
          }
          
          const userPreferredDates = preferredDatesByRequest[userRequest.id] || [];
          const otherPreferredDates = preferredDatesByRequest[otherRequest.id] || [];
          
          // Check if user wants other's date WITH shift type
          let userWantsOtherDate = false;
          for (const prefDate of userPreferredDates) {
            if (prefDate.date === otherShiftDate) {
              // Check if the user accepts this shift type
              if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
                // Get other shift type
                const otherShiftType = determineShiftType(otherRequest.shift?.startTime);
                if (prefDate.accepted_types.includes(otherShiftType)) {
                  userWantsOtherDate = true;
                  break;
                }
              }
            }
          }
          
          // Check if other user wants user's date WITH shift type
          let otherWantsUserDate = false;
          for (const prefDate of otherPreferredDates) {
            if (prefDate.date === userShiftDate) {
              // Check if the user accepts this shift type
              if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
                // Get user shift type
                const userShiftType = determineShiftType(userRequest.shift?.startTime);
                if (prefDate.accepted_types.includes(userShiftType)) {
                  otherWantsUserDate = true;
                  break;
                }
              }
            }
          }
          
          if (userWantsOtherDate && otherWantsUserDate) {
            const userShiftType = determineShiftType(userRequest.shift?.startTime);
            const otherShiftType = determineShiftType(otherRequest.shift?.startTime);
            
            console.log(`MATCH FOUND: ${userRequest.id} <-> ${otherRequest.id}`);
            console.log(`- ${userRequest.user?.first_name} wants ${otherShiftDate} (${otherShiftType}), ${otherRequest.user?.first_name} wants ${userShiftDate} (${userShiftType})`);
            
            matches.push({
              request1Id: userRequest.id,
              request2Id: otherRequest.id,
              request1ShiftDate: userShiftDate,
              request2ShiftDate: otherShiftDate,
              matchReason: "Both users want each other's shift dates with acceptable shift types",
              request1Shift: userRequest.shift,
              request2Shift: otherRequest.shift,
              request1User: userRequest.user,
              request2User: otherRequest.user
            });
          }
        }
      }
    }

    // Second pass: match any remaining requests in a general approach
    for (let i = 0; i < pendingRequests.length; i++) {
      for (let j = i + 1; j < pendingRequests.length; j++) {
        const request1 = pendingRequests[i];
        const request2 = pendingRequests[j];
        
        // Skip if the users are the same
        if (request1.requester_id === request2.requester_id) continue;
        
        // Skip if we've already processed this pair
        const matchKey = [request1.id, request2.id].sort().join('_');
        if (processedPairs.has(matchKey)) continue;
        processedPairs.add(matchKey);
        
        const request1ShiftDate = request1.shift_date;
        const request2ShiftDate = request2.shift_date;
        
        // Skip if either shift date is unknown
        if (!request1ShiftDate || !request2ShiftDate || 
            request1ShiftDate === 'Unknown' || request2ShiftDate === 'Unknown') {
          continue;
        }
        
        // Get preferred dates for both requests
        const request1PreferredDates = preferredDatesByRequest[request1.id] || [];
        const request2PreferredDates = preferredDatesByRequest[request2.id] || [];
        
        // Check if request1 wants request2's date WITH shift type
        let request1WantsRequest2Date = false;
        for (const prefDate of request1PreferredDates) {
          if (prefDate.date === request2ShiftDate) {
            // Check if the user accepts this shift type
            if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
              // Get request2 shift type
              const request2ShiftType = determineShiftType(request2.shift?.startTime);
              if (prefDate.accepted_types.includes(request2ShiftType)) {
                request1WantsRequest2Date = true;
                break;
              }
            }
          }
        }
        
        // Check if request2 wants request1's date WITH shift type
        let request2WantsRequest1Date = false;
        for (const prefDate of request2PreferredDates) {
          if (prefDate.date === request1ShiftDate) {
            // Check if the user accepts this shift type
            if (prefDate.accepted_types && prefDate.accepted_types.length > 0) {
              // Get request1 shift type
              const request1ShiftType = determineShiftType(request1.shift?.startTime);
              if (prefDate.accepted_types.includes(request1ShiftType)) {
                request2WantsRequest1Date = true;
                break;
              }
            }
          }
        }
        
        // If both conditions are met, it's a match!
        if (request1WantsRequest2Date && request2WantsRequest1Date) {
          const request1ShiftType = determineShiftType(request1.shift?.startTime);
          const request2ShiftType = determineShiftType(request2.shift?.startTime);
          
          console.log(`MATCH FOUND: ${request1.id} <-> ${request2.id}`);
          console.log(`- ${request1.user?.first_name} wants ${request2ShiftDate} (${request2ShiftType}), ${request2.user?.first_name} wants ${request1ShiftDate} (${request1ShiftType})`);
          
          // Add to matches array if not already there (avoids duplicates)
          const isDuplicate = matches.some(m => 
            (m.request1Id === request1.id && m.request2Id === request2.id) || 
            (m.request1Id === request2.id && m.request2Id === request1.id)
          );
          
          if (!isDuplicate) {
            matches.push({
              request1Id: request1.id,
              request2Id: request2.id,
              request1ShiftDate,
              request2ShiftDate,
              matchReason: "Both users want each other's shift dates with acceptable shift types",
              request1Shift: request1.shift,
              request2Shift: request2.shift,
              request1User: request1.user,
              request2User: request2.user
            });
          }
        }
      }
    }

    // Update the results
    setMatchResults(matches);
    
    // Show toast with match count
    toast({
      title: `Found ${matches.length} potential matches`,
      description: matches.length > 0 
        ? "See detailed results below" 
        : "No matches found with the simple algorithm",
      variant: matches.length > 0 ? "default" : "destructive"
    });
    
    return matches;
  };
  
  // Helper function to determine shift type
  const determineShiftType = (startTime?: string): 'day' | 'afternoon' | 'night' => {
    if (!startTime) return 'day';
    
    const startHour = parseInt(startTime.split(':')[0], 10);
    
    if (startHour <= 8) {
      return 'day';
    } else if (startHour > 8 && startHour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  return { matchResults, setMatchResults, runSimpleMatch };
};
