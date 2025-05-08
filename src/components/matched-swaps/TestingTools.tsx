
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerHourlyMatchNotification, getHourlyMatchNotificationStatus } from "@/utils/triggerHourlyCheck";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Debug tools for testing email and notification functionality
 */
export const TestingTools = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTriggerHourlyCheck = async () => {
    setIsTriggering(true);
    try {
      await triggerHourlyMatchNotification();
      // Update the status after triggering
      setTimeout(() => {
        checkFunctionStatus();
      }, 2000);
    } finally {
      setIsTriggering(false);
    }
  };

  const checkFunctionStatus = async () => {
    setIsChecking(true);
    try {
      const result = await getHourlyMatchNotificationStatus();
      setStatusResult(result);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setIsChecking(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    
    // If we're expanding and haven't checked status yet, do it now
    if (!isExpanded && !statusResult) {
      checkFunctionStatus();
    }
  };

  return (
    <div className="mb-4">
      <Button 
        onClick={toggleExpanded}
        variant="outline" 
        size="sm"
        className="w-full flex justify-between items-center text-sm font-medium mb-2 bg-gray-50 hover:bg-gray-100 border-gray-200"
      >
        Testing & Debugging Tools
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <Card className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium">Testing & Debugging Tools</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Tools for testing notification functionality
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              {/* Status section */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Hourly Check Status</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkFunctionStatus} 
                    disabled={isChecking}
                    className="h-7 text-xs"
                  >
                    {isChecking ? "Checking..." : "Refresh"}
                  </Button>
                </div>
                
                {isChecking ? (
                  <Skeleton className="h-12 w-full" />
                ) : statusResult ? (
                  <Alert variant={statusResult.success ? "default" : "destructive"} className="py-2">
                    {statusResult.success ? (
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span className="font-semibold">
                            {statusResult.data?.function?.exists 
                              ? `Function is ${statusResult.data?.function?.status}` 
                              : "Function not found"}
                          </span>
                        </div>
                        
                        <AlertDescription className="mt-1">
                          Schedule: {statusResult.data?.function?.schedule || "Not scheduled"}
                          {lastChecked && <div className="text-xs mt-1 text-muted-foreground">Last checked: {lastChecked}</div>}
                        </AlertDescription>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-semibold">Error checking status</span>
                        </div>
                        <AlertDescription className="mt-1">{statusResult.error}</AlertDescription>
                      </div>
                    )}
                  </Alert>
                ) : null}
              </div>
              
              {/* Manual trigger button */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTriggerHourlyCheck} 
                  disabled={isTriggering}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                >
                  {isTriggering ? "Triggering..." : "Trigger Hourly Match Check"}
                </Button>
                <p className="text-xs text-gray-500">
                  Manually trigger the hourly match notification check process
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 bg-gray-100 rounded-b-lg -m-4 mt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                The hourly check should run automatically every hour according to the schedule in 
                <code className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">supabase/config.toml</code>. 
                Use the button above to manually trigger it for testing.
              </div>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
