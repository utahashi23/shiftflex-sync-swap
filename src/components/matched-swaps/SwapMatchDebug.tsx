
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllSwapRequestsSafe, fetchAllPreferredDatesWithRequestsSafe, createSwapMatchSafe } from '@/utils/rls-helpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  const [isTestRunning, setIsTestRunning] = useState(false);

  const runFindMatches = async () => {
    try {
      // Call findSwapMatches with the current user ID, verbose and user perspective only
      const result = await findSwapMatches(user?.id, true, true, true);
      console.log("Match find result:", result);
      
      // After finding matches, trigger parent refresh if provided
      if (onRefreshMatches) {
        console.log("Triggering parent refresh after finding matches");
        onRefreshMatches();
      }
    } catch (error) {
      console.error("Error during match find:", error);
    }
  };

  // Function to run simple test match algorithm
  const runTestMatch = async () => {
    if (!user) return;
    
    try {
      setIsTestRunning(true);
      
      // Fetch all swap requests
      const { data: requestsData } = await fetchAllSwapRequestsSafe();
      console.log("Fetched test requests:", requestsData?.length);
      
      if (!requestsData || requestsData.length < 2) {
        toast({
          title: "Not enough requests",
          description: "Need at least 2 swap requests to find matches",
          variant: "destructive"
        });
        return;
      }
      
      // Fetch all preferred dates
      const { data: datesData } = await fetchAllPreferredDatesWithRequestsSafe();
      console.log("Fetched test preferred dates:", datesData?.length);
      
      if (!datesData || datesData.length === 0) {
        toast({
          title: "No preferred dates",
          description: "No preferred dates found for matching",
          variant: "destructive"
        });
        return;
      }
      
      // Group preferred dates by request ID for faster lookups
      const preferredDatesByRequest = (datesData || []).reduce((acc, date) => {
        if (!acc[date.request_id]) {
          acc[date.request_id] = [];
        }
        acc[date.request_id].push(date.date);
        return acc;
      }, {});
      
      let matchCount = 0;
      
      // Run the test match algorithm
      for (const request1 of requestsData) {
        if (request1.status !== 'pending') continue;
        
        for (const request2 of requestsData) {
          // Skip self-matching or requests from the same user
          if (request1.id === request2.id || request1.requester_id === request2.requester_id) {
            continue;
          }
          
          if (request2.status !== 'pending') continue;
          
          // Get shift data for both requests
          const { data: shift1 } = await supabase.rpc('get_shift_by_id', { shift_id: request1.requester_shift_id });
          const { data: shift2 } = await supabase.rpc('get_shift_by_id', { shift_id: request2.requester_shift_id });
          
          if (!shift1 || !shift2 || !shift1[0] || !shift2[0]) continue;
          
          const request1ShiftDate = shift1[0].date;
          const request2ShiftDate = shift2[0].date;
          
          // Get preferred dates for both requests
          const request1PreferredDates = preferredDatesByRequest[request1.id] || [];
          const request2PreferredDates = preferredDatesByRequest[request2.id] || [];
          
          // Check if each request wants the other's shift date
          const request1WantsRequest2Date = request1PreferredDates.includes(request2ShiftDate);
          const request2WantsRequest1Date = request2PreferredDates.includes(request1ShiftDate);
          
          // Matching condition (both users want each other's shift dates)
          if (request1WantsRequest2Date && request2WantsRequest1Date) {
            console.log(`Found match between requests ${request1.id} and ${request2.id}`);
            
            // Check if match already exists
            const { data: existingMatches, error: checkError } = await supabase
              .from('shift_swap_potential_matches')
              .select('id')
              .or(`and(requester_request_id.eq.${request1.id},acceptor_request_id.eq.${request2.id}),and(requester_request_id.eq.${request2.id},acceptor_request_id.eq.${request1.id})`)
              .limit(1);
            
            if (checkError) {
              console.error("Error checking for existing match:", checkError);
              continue;
            }
            
            if (existingMatches && existingMatches.length > 0) {
              console.log(`Match already exists with ID: ${existingMatches[0].id}`);
              continue;
            }
            
            // Create a new match
            const { data: newMatch, error: createError } = await createSwapMatchSafe(request1.id, request2.id);
            
            if (createError) {
              console.error("Error creating match:", createError);
              continue;
            }
            
            console.log(`Created new match with ID: ${newMatch?.[0]?.id || 'unknown'}`);
            matchCount++;
          }
        }
      }
      
      // Show toast with results
      if (matchCount > 0) {
        toast({
          title: "Matches found!",
          description: `Created ${matchCount} new potential matches.`,
        });
      } else {
        toast({
          title: "No new matches",
          description: "No new matches were found or created.",
          variant: "destructive"
        });
      }
      
      // Refresh matches UI
      if (onRefreshMatches) {
        onRefreshMatches();
      }
      
    } catch (error) {
      console.error("Error running test match:", error);
      toast({
        title: "Error running test match",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="mb-4">
      <Card className="border border-amber-300 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button
              disabled={isProcessing}
              variant="secondary"
              onClick={runFindMatches}
              className="bg-amber-200 hover:bg-amber-300 text-amber-900"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Find Potential Matches
            </Button>
            
            <Button
              disabled={isTestRunning}
              variant="secondary" 
              onClick={runTestMatch}
              className="bg-green-200 hover:bg-green-300 text-green-900"
            >
              {isTestRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Test Match
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
