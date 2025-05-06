
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleTestLoop = async () => {
    try {
      setIsLoading(true);
      setApiKeyStatus(null);
      setConnectionDetails(null);
      toast.info("Testing Loop.so API connection...");
      console.log("Testing Loop.so API connectivity and key validity");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      const response = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_connectivity: true, // Flag to specifically test connectivity
          test_api_key: true,
          to: "njalasankhulani@gmail.com",
          subject: `Loop.so API Connectivity Test (Attempt ${currentRetry})`,
          html: `<p>Testing API connectivity at ${new Date().toISOString()}</p>`,
          from: "admin@shiftflex.au"
        }
      });

      console.log(`Loop.so API connectivity test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        setApiKeyStatus("Connection failed");
        
        // More specific error handling
        const errorMessage = response.error instanceof Error 
          ? response.error.message 
          : String(response.error);
        
        // Check for common error patterns and provide more detailed feedback
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Timeout");
          toast.error("Loop.so API connection timed out. This may be due to network restrictions.");
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("sending request")) {
          setConnectionDetails("Network restriction");
          toast.error("Loop.so API is unreachable due to network restrictions. Please check your Supabase project's network configuration.");
        } else if (errorMessage.includes("invalid")) {
          setConnectionDetails("Invalid key");
          toast.error("Loop.so API key appears to be invalid. Please verify your API key format: it should be 32 characters with no spaces.");
        } else {
          setConnectionDetails("Network restriction");
          toast.error(`Loop.so API test failed due to network restrictions`);
        }
        
        console.error("Loop.so API connectivity test error details:", JSON.stringify(response.error));
      } else {
        setApiKeyStatus("Connected");
        setConnectionDetails(response.data?.details || "API reachable");
        toast.success("Loop.so API connection successful!");
      }
    } catch (error) {
      console.error("Error testing Loop.so API connectivity:", error);
      setApiKeyStatus("Error checking");
      setConnectionDetails("Network restriction");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error testing Loop.so API: Network restrictions preventing connections`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestLoop}
      disabled={isLoading}
      variant="outline"
      className="w-full mt-2"
    >
      {isLoading ? "Testing API Connection..." : "Test Loop.so API Connection"}
      {apiKeyStatus && (
        <span className={`ml-2 text-xs ${apiKeyStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
          ({apiKeyStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
        </span>
      )}
    </Button>
  );
}
