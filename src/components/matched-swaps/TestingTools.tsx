
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerHourlyMatchNotification, testEmailConfiguration } from "@/utils/triggerHourlyCheck";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Mail, RefreshCw, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

/**
 * Debug tools for testing email and notification functionality
 * Only visible to admin users
 */
export const TestingTools = () => {
  const { isAdmin } = useAuth();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
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
    } finally {
      setIsTriggering(false);
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
  };

  // If user is not an admin, don't render the component
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mb-4">
      <Button 
        onClick={toggleExpanded}
        variant="outline" 
        size="sm"
        className="w-full flex justify-between items-center text-sm font-medium mb-2 bg-gray-50 hover:bg-gray-100 border-gray-200"
      >
        Email Notification Testing Tools
      </Button>

      {isExpanded && (
        <Card className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium">Manual Notification Testing</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Tools for manually sending test notifications
            </CardDescription>
          </CardHeader>
          
          <div className="p-4">
            {/* Email test input */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-sm font-medium">Email Address for Testing</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address for testing"
                  className="text-sm h-8 flex-1"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isTesting || !testEmail}
                  onClick={handleTestEmail}
                  className="h-8 whitespace-nowrap"
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
          
          <CardFooter className="p-4 pt-0 bg-gray-100 rounded-b-lg -m-4 mt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                Automatic scheduling has been disabled. Use the Settings page to manually trigger notifications.
              </div>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
