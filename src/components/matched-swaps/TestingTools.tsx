
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { triggerHourlyMatchNotification, getHourlyMatchNotificationStatus, testEmailConfiguration } from "@/utils/triggerHourlyCheck";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Clock, ChevronDown, ChevronUp, Mail, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Debug tools for testing email and notification functionality
 */
export const TestingTools = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [testEmail, setTestEmail] = useState<string>("");

  const handleTriggerHourlyCheck = async () => {
    setIsTriggering(true);
    try {
      // Pass the test email if provided
      await triggerHourlyMatchNotification({
        recipient_email: testEmail || undefined,
        is_test: true
      });
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
  
  const handleTestEmail = async () => {
    if (!testEmail) {
      return;
    }
    
    setIsTesting(true);
    try {
      await testEmailConfiguration(testEmail);
    } finally {
      setIsTesting(false);
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
              Tools for testing notification functionality (runs every 5 minutes)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            <div className="space-y-4">
              {/* Email Configuration Status */}
              {statusResult?.data?.email_config && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium">Email Configuration</h4>
                  <Alert variant={statusResult.data.email_config.status === "configured" ? "default" : "destructive"} className="py-2">
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="font-semibold">
                          {statusResult.data.email_config.status === "configured" 
                            ? "Email configuration is complete" 
                            : "Email configuration is incomplete"}
                        </span>
                      </div>
                      
                      <AlertDescription className="mt-1">
                        <div className="flex flex-col gap-1">
                          <span>
                            API Key: {statusResult.data.email_config.mailgun_api_key_set ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] px-1">Set</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 text-[10px] px-1">Missing</Badge>
                            )}
                          </span>
                          <span>
                            Domain: {statusResult.data.email_config.mailgun_domain_set ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] px-1">{statusResult.data.email_config.mailgun_domain}</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 text-[10px] px-1">Not Set</Badge>
                            )}
                          </span>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                </div>
              )}
              
              {/* Status section */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Check Status (Every 5 min)</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkFunctionStatus} 
                    disabled={isChecking}
                    className="h-7 text-xs"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> 
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" /> 
                        Refresh
                      </>
                    )}
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
                          Schedule: {statusResult.data?.function?.schedule || "*/5 * * * *"}
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
              
              {/* Email test input */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 mt-4">
                <h4 className="text-sm font-medium">Email Address for Testing</h4>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address for testing"
                    className="text-sm h-8"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isTesting || !testEmail}
                    onClick={handleTestEmail}
                    className="h-8"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> 
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-2" /> 
                        Test Email
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter an email address to send test emails to
                </p>
              </div>
              
              {/* Manual trigger button */}
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleTriggerHourlyCheck} 
                  disabled={isTriggering}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> 
                      Triggering...
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-2" /> 
                      Trigger Match Check & Send Emails
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">
                  {testEmail ? 
                    `Trigger check and send test emails to: ${testEmail}` : 
                    "Manually trigger the notification check process"
                  }
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 bg-gray-100 rounded-b-lg -m-4 mt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                The notification check now runs automatically every 5 minutes according to the schedule in 
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
