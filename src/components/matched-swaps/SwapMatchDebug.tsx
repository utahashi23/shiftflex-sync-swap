import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Bug, AlertTriangle, Info, FileSearch } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '../ui/button';

export function SwapMatchDebug() {
  // Start expanded by default for better visibility
  const [isExpanded, setIsExpanded] = useState(true);
  const [verbose, setVerbose] = useState(true); // Default to true for better debugging
  const [forceCheck, setForceCheck] = useState(true); // Default to true to check all matches
  const [specificCheck, setSpecificCheck] = useState(true); // Default to true for specific issues
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [specificRequestsData, setSpecificRequestsData] = useState<any>(null);
  const { findSwapMatches, isProcessing, isFindingMatches } = useSwapMatcher();
  const { user } = useAuth();
  
  // Define known problematic IDs from user input
  const knownUserIds = ['0dba6413-6ab5-46c9-9db1-ecca3b444e34', 'b6da71dc-3749-4b92-849a-1977ff196e67'];
  const knownRequestIds = ['b70b145b-965f-462c-b8c0-366865dc7f02', '3ecb141f-5b7e-4cb2-bd83-532345876ed6'];
  
  const checkSpecificRequests = async () => {
    setIsCheckingDatabase(true);
    setLogs(prev => [...prev, "Checking specific requests mentioned in issue..."]);
    
    try {
      // Get the specific requests
      const { data: requests, error: reqError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .in('id', knownRequestIds);
        
      if (reqError) {
        setLogs(prev => [...prev, `Error fetching specific requests: ${reqError.message}`]);
        return;
      }
      
      if (!requests || requests.length === 0) {
        setLogs(prev => [...prev, "No specific requests found with the provided IDs"]);
        return;
      }
      
      setLogs(prev => [...prev, `Found ${requests.length} specific requests`]);
      
      // Get shift data
      const shiftIds = requests.map(r => r.requester_shift_id).filter(Boolean);
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftError) {
        setLogs(prev => [...prev, `Error fetching shifts: ${shiftError.message}`]);
      }
      
      // Get preferred dates
      const { data: prefDates, error: dateError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', knownRequestIds);
        
      if (dateError) {
        setLogs(prev => [...prev, `Error fetching preferred dates: ${dateError.message}`]);
      }
      
      // Get user profiles
      const userIds = [...knownUserIds].filter(Boolean);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
      if (profileError) {
        setLogs(prev => [...prev, `Error fetching profiles: ${profileError.message}`]);
      }
      
      // Store all the data
      setSpecificRequestsData({
        requests: requests || [],
        shifts: shifts || [],
        preferredDates: prefDates || [],
        profiles: profiles || []
      });
      
      setLogs(prev => [...prev, "Finished fetching specific request data"]);
      
      // Check for potential compatibility between these specific requests
      if (requests.length === 2 && shifts.length === 2 && prefDates) {
        setLogs(prev => [...prev, "Checking compatibility between the two specific requests..."]);
        
        const req1 = requests[0];
        const req2 = requests[1];
        
        const shift1 = shifts.find(s => s.id === req1.requester_shift_id);
        const shift2 = shifts.find(s => s.id === req2.requester_shift_id);
        
        if (shift1 && shift2) {
          const prefDates1 = prefDates.filter(d => d.request_id === req1.id);
          const prefDates2 = prefDates.filter(d => d.request_id === req2.id);
          
          setLogs(prev => [...prev, `Request 1 has ${prefDates1.length} preferred dates`]);
          setLogs(prev => [...prev, `Request 2 has ${prefDates2.length} preferred dates`]);
          
          // Check if req1 wants req2's shift date
          const req1WantsReq2Date = prefDates1.some(d => d.date === shift2.date);
          
          // Check if req2 wants req1's shift date
          const req2WantsReq1Date = prefDates2.some(d => d.date === shift1.date);
          
          if (req1WantsReq2Date && req2WantsReq1Date) {
            setLogs(prev => [...prev, "✅ COMPATIBLE MATCH FOUND between the specific requests!"]);
            
            // Check if a match already exists
            const { data: existingMatch, error: matchError } = await supabase
              .from('shift_swap_potential_matches')
              .select('*')
              .or(`and(requester_request_id.eq.${req1.id},acceptor_request_id.eq.${req2.id}),and(requester_request_id.eq.${req2.id},acceptor_request_id.eq.${req1.id})`)
              .limit(1);
              
            if (matchError) {
              setLogs(prev => [...prev, `Error checking existing match: ${matchError.message}`]);
            } else if (existingMatch && existingMatch.length > 0) {
              setLogs(prev => [...prev, "Match already exists between these requests"]);
              setLogs(prev => [...prev, JSON.stringify(existingMatch[0])]);
            } else {
              setLogs(prev => [...prev, "No existing match found, creating a new one..."]);
              
              // Create a new match
              const { data: newMatch, error: createError } = await supabase
                .from('shift_swap_potential_matches')
                .insert({
                  requester_request_id: req1.id,
                  acceptor_request_id: req2.id,
                  requester_shift_id: req1.requester_shift_id,
                  acceptor_shift_id: req2.requester_shift_id,
                  match_date: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();
                
              if (createError) {
                setLogs(prev => [...prev, `Error creating match: ${createError.message}`]);
              } else {
                setLogs(prev => [...prev, "✅ Successfully created a new match!"]);
                setLogs(prev => [...prev, JSON.stringify(newMatch)]);
                toast({
                  title: "Match Created!",
                  description: "Successfully created a match between the specific requests.",
                });
              }
            }
          } else {
            setLogs(prev => [...prev, "❌ Requests are NOT compatible"]);
            setLogs(prev => [...prev, `User 1 wants user 2's date: ${req1WantsReq2Date}`]);
            setLogs(prev => [...prev, `User 2 wants user 1's date: ${req2WantsReq1Date}`]);
          }
        }
      }
      
    } catch (error: any) {
      setLogs(prev => [...prev, `Error checking specific requests: ${error.message}`]);
    } finally {
      setIsCheckingDatabase(false);
    }
  };
  
  const checkDatabaseStatus = async () => {
    setIsCheckingDatabase(true);
    setLogs(prev => [...prev, "Checking database status..."]);
    
    try {
      // Check potential matches table
      const { data: matches, error: matchesError } = await supabase
        .from('shift_swap_potential_matches')
        .select('*');
        
      if (matchesError) {
        setLogs(prev => [...prev, `Error checking matches: ${matchesError.message}`]);
      } else {
        setPotentialMatches(matches || []);
        setLogs(prev => [...prev, `Found ${matches?.length || 0} potential matches in database`]);
        
        if (matches && matches.length > 0) {
          setLogs(prev => [...prev, `First match: ${JSON.stringify(matches[0])}`]);
        }
      }
      
      // Check requests table
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*');
        
      if (requestsError) {
        setLogs(prev => [...prev, `Error checking requests: ${requestsError.message}`]);
      } else {
        setLogs(prev => [...prev, `Found ${requests?.length || 0} swap requests in database`]);
      }
      
      // Call the edge function directly
      try {
        const result = await supabase.functions.invoke('get_user_matches', {
          body: { 
            user_id: user?.id, 
            verbose: true,
            specific_check: true
          }
        });
        setLogs(prev => [...prev, `Direct function call result: ${JSON.stringify(result)}`]);
      } catch (error: any) {
        setLogs(prev => [...prev, `Error calling function: ${error.message}`]);
      }
      
    } catch (error: any) {
      setLogs(prev => [...prev, `General error: ${error.message}`]);
    } finally {
      setIsCheckingDatabase(false);
    }
  };
  
  const handleFindMatches = async () => {
    try {
      // Clear previous logs
      setLogs([]);
      setShowLogs(true);
      
      // Log the environment
      console.log('Environment:', {
        mode: import.meta.env.MODE,
        isDevelopment: import.meta.env.DEV,
        isProduction: import.meta.env.PROD,
      });
      
      // Force debugging in the console
      const log = (message: string) => {
        console.log(message);
        setLogs(prev => [...prev, message]);
      };
      
      log('Starting match finding process (debug mode)');
      log(`Verbose logging: ${verbose ? 'Enabled' : 'Disabled'}`);
      log(`Force check: ${forceCheck ? 'Enabled' : 'Disabled'}`);
      log(`Specific check: ${specificCheck ? 'Enabled' : 'Disabled'}`);
      
      // Pass all options
      await findSwapMatches(undefined, forceCheck, verbose, specificCheck);
      
      toast({
        title: "Match finding complete",
        description: "The system has searched for potential swap matches."
      });
    } catch (error: any) {
      console.error('Error finding matches:', error);
      setLogs(prev => [...prev, `ERROR: ${error.message || 'Unknown error'}`]);
      toast({
        title: "Error finding matches",
        description: "There was a problem looking for matches.",
        variant: "destructive"
      });
    }
  };
  
  const handleApplySpecificFix = async () => {
    setIsCheckingDatabase(true);
    setLogs(prev => [...prev, "Applying specific fix for known issue..."]);
    
    try {
      // First check if there's an existing match
      const { data: existingMatch, error: matchError } = await supabase
        .from('shift_swap_potential_matches')
        .select('*')
        .or(`and(requester_request_id.eq.${knownRequestIds[0]},acceptor_request_id.eq.${knownRequestIds[1]}),and(requester_request_id.eq.${knownRequestIds[1]},acceptor_request_id.eq.${knownRequestIds[0]})`)
        .limit(1);
        
      if (matchError) {
        setLogs(prev => [...prev, `Error checking existing match: ${matchError.message}`]);
        setIsCheckingDatabase(false);
        return;
      }
      
      if (existingMatch && existingMatch.length > 0) {
        setLogs(prev => [...prev, "Match already exists, no need to create a new one"]);
        toast({
          title: "Match Exists",
          description: "A match already exists between the specific requests.",
        });
        setIsCheckingDatabase(false);
        return;
      }
      
      // Get the requests to make sure they exist
      const { data: requests, error: reqError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .in('id', knownRequestIds);
        
      if (reqError || !requests || requests.length < 2) {
        setLogs(prev => [...prev, `Error or insufficient requests: ${reqError?.message || 'Not enough requests'}`]);
        setIsCheckingDatabase(false);
        return;
      }
      
      // Create a match directly (force it)
      const req1 = requests[0];
      const req2 = requests[1];
      
      const { data: newMatch, error: createError } = await supabase
        .from('shift_swap_potential_matches')
        .insert({
          requester_request_id: req1.id,
          acceptor_request_id: req2.id,
          requester_shift_id: req1.requester_shift_id,
          acceptor_shift_id: req2.requester_shift_id,
          match_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (createError) {
        setLogs(prev => [...prev, `Error creating match: ${createError.message}`]);
        toast({
          title: "Error",
          description: "Could not create the match. See logs for details.",
          variant: "destructive"
        });
      } else {
        setLogs(prev => [...prev, "✅ Successfully created a new match!"]);
        setLogs(prev => [...prev, JSON.stringify(newMatch)]);
        toast({
          title: "Success!",
          description: "Applied the specific fix and created a match.",
        });
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `Error applying fix: ${error.message}`]);
    } finally {
      setIsCheckingDatabase(false);
    }
  };

  return (
    <div className="mb-6">
      {isExpanded ? (
        <Card className="border-amber-300">
          <CardHeader className="bg-amber-50 pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-amber-600" />
                <span>Swap Matching Debug Tools</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Debug</Badge>
              </div>
              <span 
                className="text-xs cursor-pointer text-muted-foreground hover:text-primary"
                onClick={() => setIsExpanded(false)}
              >
                Hide
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <Tabs defaultValue="general">
              <TabsList className="mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="specific">Specific Issue</TabsTrigger>
                <TabsTrigger value="logs">Debug Logs</TabsTrigger>
              </TabsList>
            
              <TabsContent value="general">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="verbose-logging"
                        checked={verbose}
                        onCheckedChange={setVerbose}
                      />
                      <Label htmlFor="verbose-logging" className="text-sm">
                        Verbose logging
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="force-check"
                        checked={forceCheck}
                        onCheckedChange={setForceCheck}
                      />
                      <Label htmlFor="force-check" className="text-sm">
                        Force check all matches
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button 
                      onClick={handleFindMatches}
                      disabled={isProcessing || isFindingMatches}
                      className="h-9"
                      variant="default"
                    >
                      {(isProcessing || isFindingMatches) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Processing...
                        </>
                      ) : (
                        <>Find All Possible Matches</>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={checkDatabaseStatus}
                      disabled={isCheckingDatabase}
                      className="h-9"
                    >
                      {isCheckingDatabase ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 
                          Checking...
                        </>
                      ) : (
                        <>Check Database Status</>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowLogs(!showLogs)}
                      className="h-9"
                    >
                      {showLogs ? 'Hide Logs' : 'Show Logs'}
                    </Button>
                  </div>
                  
                  {potentialMatches.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-1 text-sm font-medium text-blue-700 mb-2">
                        <Info className="h-4 w-4" />
                        <span>Database contains {potentialMatches.length} potential matches</span>
                      </div>
                      <div className="text-xs text-blue-600 overflow-x-auto">
                        {potentialMatches.slice(0, 2).map((match, idx) => (
                          <div key={idx} className="mb-1 p-1 bg-blue-100 rounded">
                            ID: {match.id}<br/>
                            Status: {match.status}<br/>
                            Requests: {match.requester_request_id} ↔ {match.acceptor_request_id}
                          </div>
                        ))}
                        {potentialMatches.length > 2 && (
                          <div className="text-blue-500 mt-1">
                            + {potentialMatches.length - 2} more matches
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="text-sm font-medium">Troubleshooting Tips</div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground pl-2 space-y-1">
                      <li>Check that you have active swap requests in the system</li>
                      <li>Ensure swap requests have preferred dates assigned</li>
                      <li>Verify that there are multiple users with compatible swap preferences</li>
                      <li>The "Check Database Status" will show if any potential matches exist</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="specific">
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Specific Issue Investigation</span>
                    </div>
                    <p className="text-xs text-yellow-700 mb-2">
                      Investigating specific users and requests mentioned in the issue.
                    </p>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-yellow-800">Users:</div>
                        <code className="text-xs bg-yellow-100 p-1 block rounded">
                          {knownUserIds.join('\n')}
                        </code>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-yellow-800">Requests:</div>
                        <code className="text-xs bg-yellow-100 p-1 block rounded">
                          {knownRequestIds.join('\n')}
                        </code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={checkSpecificRequests}
                      disabled={isCheckingDatabase}
                    >
                      {isCheckingDatabase ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 
                          Checking...
                        </>
                      ) : (
                        <>
                          <FileSearch className="mr-1 h-3 w-3" />
                          Inspect Specific Requests
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplySpecificFix}
                      disabled={isCheckingDatabase}
                    >
                      {isCheckingDatabase ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 
                          Applying...
                        </>
                      ) : (
                        <>
                          Apply Specific Fix
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {specificRequestsData && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs font-medium text-blue-800 mb-1">Specific Request Data:</div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-medium text-blue-800">Requests ({specificRequestsData.requests.length}):</div>
                          <pre className="text-xs bg-blue-100 p-1 rounded overflow-x-auto max-h-32">
                            {JSON.stringify(specificRequestsData.requests, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-blue-800">Shifts ({specificRequestsData.shifts.length}):</div>
                          <pre className="text-xs bg-blue-100 p-1 rounded overflow-x-auto max-h-32">
                            {JSON.stringify(specificRequestsData.shifts, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-xs font-medium text-blue-800">Preferred Dates ({specificRequestsData.preferredDates.length}):</div>
                          <pre className="text-xs bg-blue-100 p-1 rounded overflow-x-auto max-h-32">
                            {JSON.stringify(specificRequestsData.preferredDates, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="logs">
                <div className="mt-2">
                  <div className="text-sm font-medium mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Debug Logs</span>
                  </div>
                  <pre className="bg-slate-950 text-slate-50 p-3 rounded-md text-xs h-64 overflow-auto">
                    {logs.map((log, index) => (
                      <div key={index} className="py-1">
                        {log}
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-slate-400">No logs yet. Use the debug tools to generate logs.</div>
                    )}
                  </pre>
                  
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setLogs([])}
                      className="text-xs"
                    >
                      Clear Logs
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end mb-2">
          <Button 
            onClick={() => setIsExpanded(true)} 
            variant="ghost" 
            size="sm"
            className="text-xs flex items-center"
          >
            <Bug className="h-3.5 w-3.5 mr-1" />
            Show Debug Tools
          </Button>
        </div>
      )}
    </div>
  );
}
