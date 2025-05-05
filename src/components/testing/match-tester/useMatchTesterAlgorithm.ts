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
    const preferredDatesByRequest: Record<string, string[]> = {};
    allPreferredDates.forEach(date => {
      if (!preferredDatesByRequest[date.request_id]) {
        preferredDatesByRequest[date.request_id] = [];
      }
      preferredDatesByRequest[date.request_id].push(date.date);
    });

    console.log("Preferred dates grouped by request:", Object.keys(preferredDatesByRequest).length);
    
    // Show current user's requests
    if (user) {
      const userRequests = allRequests.filter(r => r.requester_id === user.id);
      console.log(`User ${user.id} has ${userRequests.length} requests`);
      userRequests.forEach(req => {
        console.log(`- Request ${req.id}: shift date ${req.shift_date}, preferred dates: ${preferredDatesByRequest[req.id]?.join(', ') || 'none'}`);
      });
    }

    const matches: MatchTestResult[] = [];
    const processedPairs = new Set();

    // First pass: prioritize matches for the current user
    if (user) {
      const userRequests = allRequests.filter(req => req.requester_id === user.id && req.status === 'pending');
      const otherRequests = allRequests.filter(req => req.requester_id !== user.id && req.status === 'pending');
      
      console.log(`Found ${userRequests.length} pending requests for current user and ${otherRequests.length} for other users`);
      
      // Check each of current user's requests against other users' requests
      for (const userRequest of userRequests) {
        for (const otherRequest of otherRequests) {
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
          
          const userWantsOtherDate = userPreferredDates.includes(otherShiftDate);
          const otherWantsUserDate = otherPreferredDates.includes(userShiftDate);
          
          if (userWantsOtherDate && otherWantsUserDate) {
            console.log(`MATCH FOUND: ${userRequest.id} <-> ${otherRequest.id}`);
            console.log(`- ${userRequest.user?.first_name} wants ${otherShiftDate}, ${otherRequest.user?.first_name} wants ${userShiftDate}`);
            
            matches.push({
              request1Id: userRequest.id,
              request2Id: otherRequest.id,
              request1ShiftDate: userShiftDate,
              request2ShiftDate: otherShiftDate,
              matchReason: "Both users want each other's shift dates",
              request1Shift: userRequest.shift,
              request2Shift: otherRequest.shift,
              request1User: userRequest.user,
              request2User: otherRequest.user
            });
          }
        }
      }
    }

    // Second pass: match any remaining pending requests
    for (let i = 0; i < allRequests.length; i++) {
      const request1 = allRequests[i];
      if (request1.status !== 'pending') continue;
      
      for (let j = i + 1; j < allRequests.length; j++) {
        const request2 = allRequests[j];
        if (request2.status !== 'pending') continue;
        
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
        
        // Check if each request wants the other's shift date
        const request1WantsRequest2Date = request1PreferredDates.includes(request2ShiftDate);
        const request2WantsRequest1Date = request2PreferredDates.includes(request1ShiftDate);
        
        // If both conditions are met, it's a match!
        if (request1WantsRequest2Date && request2WantsRequest1Date) {
          console.log(`MATCH FOUND: ${request1.id} <-> ${request2.id}`);
          console.log(`- ${request1.user?.first_name} wants ${request2ShiftDate}, ${request2.user?.first_name} wants ${request1ShiftDate}`);
          
          matches.push({
            request1Id: request1.id,
            request2Id: request2.id,
            request1ShiftDate,
            request2ShiftDate,
            matchReason: "Both users want each other's shift dates",
            request1Shift: request1.shift,
            request2Shift: request2.shift,
            request1User: request1.user,
            request2User: request2.user
          });
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

  return { matchResults, setMatchResults, runSimpleMatch };
};
