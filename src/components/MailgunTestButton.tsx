
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleTestMailgun = async () => {
    try {
      setIsLoading(true);
      setTestResult(null);
      setErrorDetails(null);
      toast.info("Testing Mailgun email service...");

      // Try SDK approach first
      console.log("Testing Mailgun SDK integration...");
      const sdkResponse = await supabase.functions.invoke('test_mailgun_sdk', {
        body: { timestamp: new Date().toISOString() }
      });

      console.log("Mailgun SDK test response:", sdkResponse);

      if (sdkResponse.error) {
        console.error("Mailgun SDK test failed:", sdkResponse.error);
        // Try SMTP approach as fallback
        toast.warning("SDK approach failed, trying SMTP...");
        
        console.log("Testing Mailgun SMTP integration...");
        const smtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
          body: { test_attempt: 1, timestamp: new Date().toISOString() }
        });
        
        console.log("Mailgun SMTP test response:", smtpResponse);
        
        if (smtpResponse.error) {
          const sdkErrorMessage = sdkResponse.error?.message || JSON.stringify(sdkResponse.error);
          const smtpErrorMessage = smtpResponse.error?.message || JSON.stringify(smtpResponse.error);
          
          const errorMsg = `Both SDK and SMTP approaches failed.`;
          setErrorDetails(`SDK Error: ${sdkErrorMessage}\n\nSMTP Error: ${smtpErrorMessage}`);
          throw new Error(errorMsg);
        } else {
          setTestResult("SMTP Success");
          toast.success("Mailgun SMTP test successful! Check your inbox.");
        }
      } else {
        setTestResult("SDK Success");
        toast.success("Mailgun SDK test successful! Check your inbox.");
      }
    } catch (error) {
      console.error("Error testing Mailgun:", error);
      setTestResult("Failed");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Mailgun test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button 
        onClick={handleTestMailgun}
        disabled={isLoading}
        variant="default"
        className="w-full mt-2"
      >
        {isLoading ? "Testing Mailgun..." : "Test Mailgun Service"}
        {testResult && (
          <span className={`ml-2 text-xs ${
            testResult.includes("Success") ? "text-green-500" : "text-red-500"
          }`}>
            ({testResult})
          </span>
        )}
      </Button>
      
      {errorDetails && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-mono whitespace-pre-wrap">
          <p className="font-semibold mb-1">Error Details:</p>
          {errorDetails}
        </div>
      )}
    </div>
  );
}
