
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Bug, AlertTriangle } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

export function SwapMatchDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verbose, setVerbose] = useState(true); // Default to true for better debugging
  const [forceCheck, setForceCheck] = useState(true); // Default to true to check all matches
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { findSwapMatches, isProcessing, isFindingMatches } = useSwapMatcher();
  
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
              
              <div className="flex gap-2 items-center">
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
                  onClick={() => setShowLogs(!showLogs)}
                  className="h-9"
                >
                  {showLogs ? 'Hide Logs' : 'Show Logs'}
                </Button>
              </div>
              
              {showLogs && logs.length > 0 && (
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
                  <li>Enable verbose logging to see detailed match information</li>
                  <li>Force check will search for all possible matches regardless of status</li>
                  <li>If no matches are found, verify that swap requests exist with preferred dates</li>
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
