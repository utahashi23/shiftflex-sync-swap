
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleTestSmtp = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setConnectionDetails(null);
      setShowError(false);
      toast.info("Testing Loop.so SMTP connection...");
      console.log("Testing Loop.so SMTP connectivity");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      // Call the edge function to test Loop.so SMTP
      const response = await supabase.functions.invoke('test_loopso_smtp', {
        body: {
          test_attempt: currentRetry,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Loop.so SMTP test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        setTestStatus("Connection failed");
        
        const errorMessage = response.error instanceof Error 
          ? response.error.message 
          : String(response.error);
        
        // Check for common error patterns and provide more detailed feedback
        if (errorMessage.includes("lookup") || errorMessage.includes("dns")) {
          setConnectionDetails("DNS Resolution Issue");
          setShowError(true);
          toast.error("SMTP server DNS lookup failed. This is likely a DNS resolution issue in the Edge Function environment.");
        } else if (errorMessage.includes("timeout")) {
          setConnectionDetails("Timeout");
          toast.error("SMTP connection timed out. This may be due to network connectivity issues.");
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("connection refused")) {
          setConnectionDetails("Connection refused");
          toast.error("SMTP server is unreachable. The server might be down or blocking connections.");
        } else if (errorMessage.includes("authentication")) {
          setConnectionDetails("Auth failed");
          toast.error("SMTP authentication failed. Please verify your credentials.");
        } else {
          setConnectionDetails("Connection error");
          toast.error(`SMTP test failed: ${errorMessage}`);
        }
        
        console.error("SMTP test error details:", JSON.stringify(response.error));
      } else {
        setTestStatus("Connected");
        setConnectionDetails(response.data?.message || "SMTP working");
        toast.success("SMTP connection successful! Email sent via Loop.so SMTP.");
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      setTestStatus("Error");
      setConnectionDetails("Test failed");
      setShowError(true);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error testing SMTP: ${errorMessage || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleTestSmtp}
        disabled={isLoading}
        variant="outline"
        className="w-full mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Loop.so SMTP Connection...
          </>
        ) : (
          "Test Loop.so SMTP Connection"
        )}
        {testStatus && (
          <span className={`ml-2 text-xs ${testStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
            ({testStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
          </span>
        )}
      </Button>

      {showError && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            DNS resolution failed for smtp.loop.so. This is a common issue with Supabase Edge Functions and external domain name resolution. 
            Try using an IP address instead of a domain name in your SMTP configuration, or contact Supabase support for assistance with DNS resolution in Edge Functions.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
