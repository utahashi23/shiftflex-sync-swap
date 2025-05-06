
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleTestSmtp = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setConnectionDetails(null);
      toast.info("Testing SMTP connection...");
      console.log("Testing SMTP connectivity with Mailgun");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      // Call the edge function to test SMTP
      const response = await supabase.functions.invoke('test_mailgun_smtp', {
        body: {
          test_attempt: currentRetry,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`SMTP test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        setTestStatus("Connection failed");
        
        const errorMessage = response.error instanceof Error 
          ? response.error.message 
          : String(response.error);
        
        // Check for common error patterns and provide more detailed feedback
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Timeout");
          toast.error("SMTP connection timed out. This may be due to network restrictions.");
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("connection refused")) {
          setConnectionDetails("Network restriction");
          toast.error("SMTP server is unreachable due to network restrictions. Please check your Supabase project's network configuration.");
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
        toast.success("SMTP connection successful! Email sent via SMTP.");
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      setTestStatus("Error");
      setConnectionDetails("Test failed");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error testing SMTP: ${errorMessage || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestSmtp}
      disabled={isLoading}
      variant="outline"
      className="w-full mt-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Testing SMTP Connection...
        </>
      ) : (
        "Test Mailgun SMTP Connection"
      )}
      {testStatus && (
        <span className={`ml-2 text-xs ${testStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
          ({testStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
        </span>
      )}
    </Button>
  );
}
