
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleTestMailgun = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setConnectionDetails(null);
      setShowError(false);
      toast.info("Testing Mailgun connection (US region)...");
      console.log("Testing Mailgun connectivity with SMTP (US region)");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      // Call the SMTP test function with specific test email
      const response = await supabase.functions.invoke('test_mailgun_smtp', {
        body: {
          recipientEmail: "njalasankhulani@gmail.com", // You can change this to your email
          test_attempt: currentRetry,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Mailgun SMTP test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        setTestStatus("Connection failed");
        
        const errorMessage = response.error instanceof Error 
          ? response.error.message 
          : String(response.error);
        
        // Check for common error patterns
        if (errorMessage.includes("authentication")) {
          setConnectionDetails("Auth failed");
          setShowError(true);
          toast.error("SMTP authentication failed. Please verify the credentials.");
        } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
          setConnectionDetails("Network restriction");
          setShowError(true);
          toast.error("Network restriction detected. This is a common issue with Supabase Edge Functions.");
        } else {
          setConnectionDetails("Error");
          toast.error(`Mailgun test failed: ${errorMessage}`);
        }
      } else {
        setTestStatus("Connected");
        setConnectionDetails(response.data?.message || "SMTP working");
        toast.success("Mailgun SMTP connection successful! Test email sent.");
      }
    } catch (error) {
      console.error("Error testing Mailgun:", error);
      setTestStatus("Error");
      setConnectionDetails("Test failed");
      setShowError(true);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error testing Mailgun: ${errorMessage || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleTestMailgun}
        disabled={isLoading}
        variant="outline"
        className="w-full mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Mailgun SMTP (US)...
          </>
        ) : (
          "Test Mailgun SMTP Connection (US)"
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
            Connection to Mailgun SMTP server (US region) failed. This may be due to network restrictions in Supabase Edge Functions.
            The provided credentials (admin@shiftflex.au) were used for this test.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
