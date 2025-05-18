
import { useSwapMatcher } from '@/hooks/swap-matching';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Bug, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  const [debugResults, setDebugResults] = useState<any>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [showDebugOutput, setShowDebugOutput] = useState(false);

  const runDirectApiCall = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to access this functionality.",
        variant: "destructive"
      });
      return;
    }

    setDebugResults(null);
    setDebugError(null);
    setShowDebugOutput(true);
    
    try {
      toast({
        title: "Direct API Call",
        description: "Calling get_user_matches edge function directly...",
      });
      
      const response = await fetch(`https://ponhfgbpxehsdlxjpszg.supabase.co/functions/v1/get_user_matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbmhmZ2JweGVoc2RseGpwc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODM0NDcsImV4cCI6MjA2MTU1OTQ0N30.-n7sUFjxDJUCpMMA0AGnXlQCkaVt31dER91ZQLO3jDs`
        },
        body: JSON.stringify({
          user_id: user.id,
          bypass_rls: true,
          verbose: true,
          user_initiator_only: false
        })
      });
      
      const result = await response.json();
      
      setDebugResults(result);
      console.log("Direct API call result:", result);
      
      if (result.success) {
        const matchCount = result.matches?.length || 0;
        toast({
          title: `Direct API call: Found ${matchCount} matches`,
          description: matchCount > 0 
            ? "Check the debug panel for details." 
            : "No matches found. Check the debug panel for details.",
          variant: matchCount > 0 ? "default" : "destructive"
        });
      } else {
        setDebugError(result.error || "API error with no specific message");
        toast({
          title: "API Error",
          description: result.error || "An error occurred with the direct API call.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error during direct API call:", error);
      setDebugError(error.message || "Unknown error occurred");
      toast({
        title: "API Error",
        description: error.message || "Failed to make direct API call.",
        variant: "destructive"
      });
    }
  };

  const runFindMatches = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setDebugResults(null);
      setDebugError(null);
      setShowDebugOutput(true);
      
      toast({
        title: "Finding matches",
        description: "Looking for potential shift swap matches...",
      });
      
      // Enable verbose logging to trace the matching process
      const result = await findSwapMatches(user.id, true, true);
      
      console.log("Match find detailed result:", JSON.stringify(result, null, 2));
      setDebugResults(result);
      
      if (result.success) {
        const matchCount = result.matches?.length || 0;
        toast({
          title: `Found ${matchCount} matches`,
          description: matchCount > 0 
            ? "Check the debug panel for detailed matching information." 
            : "No matches found. Check the debug panel for details.",
          variant: matchCount > 0 ? "default" : "destructive"
        });
      } else {
        setDebugError(result.message || "No specific error message provided");
        toast({
          title: "No matches found",
          description: result.message || "Could not find any potential matches.",
          variant: "destructive"
        });
      }
      
      // After finding matches, trigger parent refresh if provided
      if (onRefreshMatches) {
        console.log("Triggering parent refresh after finding matches");
        onRefreshMatches();
      }
    } catch (error: any) {
      console.error("Error during match find:", error);
      setDebugError(error.message || "Unknown error occurred");
      toast({
        title: "Error finding matches",
        description: error.message || "There was a problem finding potential matches.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="mb-4">
      <Card className="border border-amber-300 bg-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Swap Match Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-4">
            <p className="text-sm text-amber-800">
              Run these tools to find potential swap matches or diagnose issues.
            </p>
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
                variant="outline"
                onClick={runDirectApiCall}
                className="text-amber-900 border-amber-300"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bug className="mr-2 h-4 w-4" />
                )}
                Direct API Call
              </Button>
              
              {showDebugOutput && (
                <Button
                  variant="outline"
                  onClick={() => setShowDebugOutput(!showDebugOutput)}
                  className="text-amber-900 border-amber-300"
                >
                  {showDebugOutput ? "Hide Debug Info" : "Show Debug Info"}
                </Button>
              )}
            </div>
            
            {showDebugOutput && (
              <div className="mt-4 bg-white p-4 rounded-md border border-amber-200 overflow-auto max-h-96">
                <h4 className="font-medium text-amber-900 mb-2">Debugging Information</h4>
                
                {isProcessing && (
                  <div className="flex items-center text-amber-800">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing match request...
                  </div>
                )}
                
                {debugError && (
                  <div className="mb-4">
                    <div className="flex items-center text-red-600">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Error encountered
                    </div>
                    <pre className="bg-red-50 p-2 rounded mt-1 text-xs overflow-auto">
                      {debugError}
                    </pre>
                  </div>
                )}
                
                {debugResults && (
                  <div>
                    <p className="text-sm mb-2">
                      <span className="font-medium">Status:</span> {debugResults.success ? "Success" : "Failed"}
                    </p>
                    <p className="text-sm mb-2">
                      <span className="font-medium">Matches found:</span> {debugResults.matches?.length || 0}
                    </p>
                    
                    {debugResults.matches?.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Match details:</p>
                        <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto h-32">
                          {JSON.stringify(debugResults.matches, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-800">
                        No matches found. This could be because:
                        <ul className="list-disc list-inside mt-1 ml-2">
                          <li>There are no other users with compatible swap requests</li>
                          <li>The dates requested don't align with others' offerings</li>
                          <li>There's an issue with the matching algorithm</li>
                          <li>RLS policies may be blocking access to necessary data</li>
                        </ul>
                      </p>
                    )}
                    
                    {debugResults.rawApiData && (
                      <div className="mt-4">
                        <p className="text-sm font-medium">Raw API data:</p>
                        <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto h-32">
                          {JSON.stringify(debugResults.rawApiData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
