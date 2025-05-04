
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Bug, AlertTriangle, Info } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { supabase } from '@/integrations/supabase/client';

export function SwapMatchDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verbose, setVerbose] = useState(true); // Default to true for better debugging
  const [forceCheck, setForceCheck] = useState(true); // Default to true to check all matches
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const { findSwapMatches, isProcessing, isFindingMatches } = useSwapMatcher();
  
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
      
      // Check direct function call
      try {
        const result = await supabase.functions.invoke('get_user_matches', {
          body: { user_id: (await supabase.auth.getUser()).data.user?.id, verbose: true }
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
      
      // Pass the verbose and forceCheck options
      await findSwapMatches(undefined, forceCheck, verbose);
      
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

  return (
    <div className="mb-6">
      {isExpanded ? (
        <Card className="border-amber-300">
          <CardHeader className="bg-amber-50 pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-amber-600" />
                <span>Swap Matching Debug Tools</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">Admin</Badge>
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
              
              {showLogs && (
                <div className="mt-4">
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
                  </pre>
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
            Debug Tools
          </Button>
        </div>
      )}
    </div>
  );
}
