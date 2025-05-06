
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);

  const handleTestLoop = async () => {
    try {
      setIsLoading(true);
      setApiKeyStatus(null);
      setConnectionDetails(null);
      toast.info("Testing Loop.so API connection...");
      console.log("Testing Loop.so API connectivity and key validity");

      const response = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_connectivity: true, // Flag to specifically test connectivity
          test_api_key: true,
          to: "njalasankhulani@gmail.com",
          subject: "Loop.so API Connectivity Test",
          html: `<p>Testing API connectivity at ${new Date().toISOString()}</p>`,
          from: "admin@shiftflex.au"
        }
      });

      console.log("Loop.so API connectivity test response:", response);

      if (response.error) {
        setApiKeyStatus("Connection failed");
        
        // More specific error handling
        let errorMessage = response.error.message || String(response.error);
        
        // Check for common error patterns and provide more detailed feedback
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Timeout");
          toast.error("Loop.so API connection timed out. Please check your network connection and firewall settings.");
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("sending request")) {
          setConnectionDetails("Network issue");
          toast.error("Loop.so API is unreachable. This appears to be a network connectivity issue. Please check if your Supabase Edge Function can reach external APIs.");
        } else if (errorMessage.includes("invalid")) {
          setConnectionDetails("Invalid key");
          toast.error("Loop.so API key appears to be invalid. Please verify your API key.");
        } else {
          setConnectionDetails("Unknown error");
          toast.error(`Loop.so API test failed: ${errorMessage}`);
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
      setConnectionDetails("Exception");
      toast.error(`Error testing Loop.so API: ${error.message || "Unknown error"}`);
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
