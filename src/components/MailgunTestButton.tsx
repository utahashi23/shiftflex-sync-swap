
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Check } from "lucide-react";
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
      console.log("Testing Mailgun API connectivity (US region)");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      // Call the API test function first (more likely to succeed with network restrictions)
      const response = await supabase.functions.invoke('test_mailgun_sdk', {
        body: {
          recipientEmail: "njalasankhulani@gmail.com", // You can change this to your email
          test_attempt: currentRetry,
          timestamp: new Date().toISOString(),
          region: "US"
        }
      });

      console.log(`Mailgun API test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        // If API test fails, try SMTP as fallback
        console.log("API test failed, trying SMTP...");
        const smtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
          body: {
            recipientEmail: "njalasankhulani@gmail.com",
            test_attempt: currentRetry,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log(`Mailgun SMTP test response:`, smtpResponse);
        
        if (smtpResponse.error) {
          setTestStatus("Connection failed");
          const errorMessage = smtpResponse.error instanceof Error 
            ? smtpResponse.error.message 
            : String(smtpResponse.error);
          
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
          setConnectionDetails(smtpResponse.data?.message || "SMTP working");
          toast.success("Mailgun SMTP connection successful! Test email sent.");
        }
      } else {
        // API test successful
        setTestStatus("Connected");
        setConnectionDetails(response.data?.message || "API working");
        toast.success("Mailgun API connection successful! Test email sent via US region.");
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
            Testing Mailgun (US region)...
          </>
        ) : (
          "Test Mailgun API Connection (US)"
        )}
        {testStatus && (
          <span className={`ml-2 text-xs ${testStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
            {testStatus === "Connected" && <Check className="inline h-3 w-3 mr-1" />}
            ({testStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
          </span>
        )}
      </Button>

      {showError && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection to Mailgun server (US region) failed. This may be due to network restrictions in Supabase Edge Functions.
            The test was attempted with your configured API key on the US region endpoint.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
