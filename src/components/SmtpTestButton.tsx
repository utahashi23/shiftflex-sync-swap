
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);

  const handleTestLoop = async () => {
    try {
      setIsLoading(true);
      setApiKeyStatus(null);
      toast.info("Testing Loop.so API connection...");
      console.log("Testing Loop.so API key validity");

      const response = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_api_key: true, // Special flag to test API key only
          to: "njalasankhulani@gmail.com",
          subject: "Loop.so API Key Test",
          html: `<p>Testing API key at ${new Date().toISOString()}</p>`,
          from: "admin@shiftflex.au"
        }
      });

      console.log("Loop.so API key test response:", response);

      if (response.error) {
        setApiKeyStatus("Connection failed");
        
        // More specific error handling
        let errorMessage = response.error.message || String(response.error);
        
        // Check for common error patterns
        if (errorMessage.includes("timeout")) {
          toast.error("Loop.so API connection timed out. Please check your network connection and firewall settings.");
        } else if (errorMessage.includes("unreachable")) {
          toast.error("Loop.so API is unreachable. Please check your network connection or if Loop.so is having an outage.");
        } else if (errorMessage.includes("invalid")) {
          toast.error("Loop.so API key appears to be invalid. Please verify your API key.");
        } else {
          toast.error(`Loop.so API test failed: ${errorMessage}`);
        }
        
        console.error("Loop.so API key test error details:", JSON.stringify(response.error));
      } else {
        setApiKeyStatus("Connected");
        toast.success("Loop.so API connection successful!");
      }
    } catch (error) {
      console.error("Error testing Loop.so API key:", error);
      setApiKeyStatus("Error checking");
      toast.error(`Error testing Loop.so API key: ${error.message || "Unknown error"}`);
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
          ({apiKeyStatus})
        </span>
      )}
    </Button>
  );
}
