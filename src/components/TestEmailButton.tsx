
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TestEmailButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);

  const handleTestEmail = async () => {
    try {
      setIsLoading(true);
      setApiStatus(null);
      setConnectionDetails(null);
      toast.info("Testing Loop.so email service...");

      // Test API connectivity first
      console.log("Testing Loop.so API connectivity first...");
      const connectivityResponse = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_connectivity: true,
          test_api_key: true,
          to: "test@example.com",
          subject: "Connectivity Test",
          html: "<p>Connectivity test</p>"
        }
      });

      console.log("API connectivity test response:", connectivityResponse);

      if (connectivityResponse.error) {
        setApiStatus("Connection failed");
        
        // More specific error handling
        let errorMessage = connectivityResponse.error.message || String(connectivityResponse.error);
        
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Timeout");
          toast.error("Loop.so API connection timed out. Please check your network connection.");
          console.error("API connectivity test error details:", JSON.stringify(connectivityResponse.error));
          setIsLoading(false);
          return;
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("sending request")) {
          setConnectionDetails("Network issue");
          toast.error("Loop.so API is unreachable. This appears to be a network connectivity issue. Check if your Supabase Edge Functions can reach external APIs.");
          console.error("API connectivity test error details:", JSON.stringify(connectivityResponse.error));
          setIsLoading(false);
          return;
        } else {
          setConnectionDetails("Unknown error");
          toast.error(`API connectivity test failed: ${errorMessage}`);
          console.error("API connectivity test error details:", JSON.stringify(connectivityResponse.error));
          setIsLoading(false);
          return;
        }
      }

      setApiStatus("API connected");
      setConnectionDetails(connectivityResponse.data?.details || "API reachable");
      toast.success("Loop.so API connection successful! Proceeding with test email...");

      // Now test email sending with the verified key
      console.log("Calling test_loop_email function...");
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: {}
      });

      console.log("Loop.so test email response:", loopResponse);

      if (loopResponse.error) {
        setApiStatus("Email failed");
        
        // More specific error handling
        let errorMessage = loopResponse.error.message || String(loopResponse.error);
        
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Sending timeout");
          toast.error("Email sending timed out. This could be due to network issues.");
        } else if (errorMessage.includes("validation")) {
          setConnectionDetails("Validation error");
          toast.error("Email validation failed. Please check your sending domain configuration in Loop.so.");
        } else {
          setConnectionDetails("Send error");
          toast.error(`Loop.so Test failed: ${errorMessage}`);
        }
        
        console.error("Loop.so test error details:", JSON.stringify(loopResponse.error));
      } else {
        setApiStatus("Email sent");
        setConnectionDetails("Success");
        toast.success("Loop.so Test email sent! Check your inbox for njalasankhulani@gmail.com.");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      setApiStatus("Error");
      setConnectionDetails("Exception");
      toast.error(`Error testing email: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestEmail}
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? "Testing..." : "Test Email Functionality"}
      {apiStatus && (
        <span className={`ml-2 text-xs ${apiStatus.includes("connected") || apiStatus.includes("sent") ? "text-green-500" : "text-red-500"}`}>
          ({apiStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
        </span>
      )}
    </Button>
  );
}
