
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { fetchAllSwapRequestsSafe, fetchAllPreferredDatesWithRequestsSafe, createSwapMatchSafe } from '@/utils/rls-helpers';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { SwapCard } from '../matched-swaps/SwapCard';

interface MatchTestResult {
  request1Id: string;
  request2Id: string;
  request1ShiftDate: string;
  request2ShiftDate: string;
  matchReason: string;
  // Add additional data for displaying shift details
  request1Shift?: any;
  request2Shift?: any;
  request1User?: any;
  request2User?: any;
}

interface SimpleMatchTesterProps {
  onMatchCreated?: () => void; // Add callback for when a match is created
}

const SimpleMatchTester = ({ onMatchCreated }: SimpleMatchTesterProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [allPreferredDates, setAllPreferredDates] = useState<any[]>([]);
  const [matchResults, setMatchResults] = useState<MatchTestResult[]>([]);

  // Fetch all the data needed for testing
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all swap requests
      const { data: requestsData } = await fetchAllSwapRequestsSafe();
      
      // Fetch shift data for each request
      const enrichedRequests = await Promise.all((requestsData || []).map(async (request) => {
        // Get the shift data using the request's requester_shift_id
        const { data: shiftData } = await supabase.rpc('get_shift_by_id', { shift_id: request.requester_shift_id });
        
        // Get the user data
        const { data: userData } = await supabase
          .from('profiles')
          .select('first_name, last_name, organization, employee_id')
          .eq('id', request.requester_id)
          .single();
        
        return {
          ...request,
          shift_date: shiftData?.[0]?.date || 'Unknown',
          shift: shiftData?.[0] || {},
          user: userData || { first_name: 'Unknown', last_name: 'User' },
          colleagueType: userData?.organization || 'Unspecified'
        };
      }));
      
      setAllRequests(enrichedRequests || []);
      
      // Fetch all preferred dates
      const { data: datesData } = await fetchAllPreferredDatesWithRequestsSafe();
      setAllPreferredDates(datesData || []);
      
      console.log("Fetched requests:", enrichedRequests?.length);
      console.log("Fetched preferred dates:", datesData?.length);
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch test data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run the test match algorithm using your logic
  const runSimpleMatch = () => {
    if (!allRequests || !allPreferredDates) {
      toast({
        title: "No data",
        description: "Please fetch data first",
        variant: "destructive"
      });
      return;
    }

    // Group preferred dates by request ID for faster lookups
    const preferredDatesByRequest = allPreferredDates.reduce((acc, date) => {
      if (!acc[date.request_id]) {
        acc[date.request_id] = [];
      }
      acc[date.request_id].push(date.date);
      return acc;
    }, {});

    const matches: MatchTestResult[] = [];

    // Your algorithm implemented here
    for (const request1 of allRequests) {
      if (request1.status !== 'pending') continue; // Only check pending requests
      
      for (const request2 of allRequests) {
        // Skip self-matching or requests from the same user
        if (request1.id === request2.id || request1.requester_id === request2.requester_id) {
          continue;
        }
        
        if (request2.status !== 'pending') continue; // Only match with other pending requests
        
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
  };

  // Load data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Format a date string in a friendly way
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  // Create a match in the database for a successful match
  const createMatch = async (match: MatchTestResult) => {
    try {
      setIsLoading(true);
      
      // First, check if this match already exists
      const { data: existingMatches, error: checkError } = await supabase
        .from('shift_swap_potential_matches')
        .select('id')
        .or(`and(requester_request_id.eq.${match.request1Id},acceptor_request_id.eq.${match.request2Id}),and(requester_request_id.eq.${match.request2Id},acceptor_request_id.eq.${match.request1Id})`)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingMatches && existingMatches.length > 0) {
        toast({
          title: "Match already exists",
          description: `This match is already in the database with ID: ${existingMatches[0].id}`,
          variant: "default"
        });
        return;
      }
      
      // Use the helper function to create the match
      const { data, error } = await createSwapMatchSafe(match.request1Id, match.request2Id);
      
      if (error) throw error;
      
      toast({
        title: "Match created successfully",
        description: `Created match with ID: ${data?.[0].id || 'unknown'}`,
        variant: "default"
      });
      
      // Update request statuses to 'matched'
      await Promise.all([
        supabase
          .from('shift_swap_requests')
          .update({ status: 'matched' })
          .eq('id', match.request1Id),
        supabase
          .from('shift_swap_requests')
          .update({ status: 'matched' })
          .eq('id', match.request2Id)
      ]);
      
      // Call the callback if provided
      if (onMatchCreated) {
        onMatchCreated();
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Error creating match",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create SwapMatch objects for displaying
  const createSwapMatchCard = (match: MatchTestResult) => {
    const shift1 = match.request1Shift;
    const shift2 = match.request2Shift;
    
    if (!shift1 || !shift2) return null;
    
    const user1 = match.request1User;
    const user2 = match.request2User;
    
    return {
      id: `potential-${match.request1Id}-${match.request2Id}`,
      status: 'potential',
      myShift: {
        id: shift1.id,
        date: shift1.date,
        startTime: shift1.start_time,
        endTime: shift1.end_time,
        truckName: shift1.truck_name,
        type: getShiftType(shift1.start_time),
        colleagueType: user1?.organization || 'Unspecified'
      },
      otherShift: {
        id: shift2.id,
        date: shift2.date,
        startTime: shift2.start_time,
        endTime: shift2.end_time,
        truckName: shift2.truck_name,
        type: getShiftType(shift2.start_time),
        userId: shift2.user_id,
        userName: user2 ? `${user2.first_name} ${user2.last_name}` : 'Unknown User',
        colleagueType: user2?.organization || 'Unspecified'
      },
      myRequestId: match.request1Id,
      otherRequestId: match.request2Id,
      createdAt: new Date().toISOString()
    };
  };
  
  // Helper function to get shift type
  const getShiftType = (startTime: string): string => {
    if (!startTime) return 'unknown';
    
    const hour = parseInt(startTime.split(':')[0], 10);
    
    if (hour <= 8) return 'day';
    if (hour > 8 && hour < 16) return 'afternoon';
    return 'night';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          Swap Match Testing
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={runSimpleMatch}
              disabled={isLoading || !allRequests.length}
            >
              Run Test Match
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-3">
          <div className="flex gap-4">
            <div>
              <span className="font-semibold">Requests:</span> {allRequests.length}
            </div>
            <div>
              <span className="font-semibold">Preferred Dates:</span> {allPreferredDates.length}
            </div>
            <div>
              <span className="font-semibold">Matches Found:</span> {matchResults.length}
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading...
            </div>
          )}
          
          {matchResults.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Match Results:</h3>
              <div className="space-y-4 mt-4">
                {matchResults.map((match, index) => {
                  // Create swap match object for the card
                  const swapMatch = createSwapMatchCard(match);
                  
                  return (
                    <div key={index} className="border border-green-200 rounded-md p-3">
                      <div className="flex justify-between mb-3">
                        <div className="font-semibold">Potential Match #{index + 1}</div>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                          onClick={() => createMatch(match)}
                          disabled={isLoading}
                        >
                          Create This Match
                        </Button>
                      </div>
                      
                      {swapMatch && (
                        <SwapCard 
                          swap={swapMatch} 
                          isPast={false}
                        />
                      )}
                      
                      <div className="mt-2">
                        <Badge variant="outline" className="bg-green-100">{match.matchReason}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {!isLoading && matchResults.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No matches found. Try running the test after fetching data.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleMatchTester;
