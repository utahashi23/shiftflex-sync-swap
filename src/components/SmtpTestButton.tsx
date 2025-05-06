
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
      toast.info("Testing Loop.so API Key and connection...");
      console.log("Testing Loop.so API Key validity");

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
        setApiKeyStatus("Invalid or unreachable");
        toast.error(`Loop.so API Key test failed: ${response.error.message || response.error}`);
        console.error("Loop.so API key test error details:", JSON.stringify(response.error));
      } else {
        setApiKeyStatus("Valid");
        toast.success("Loop.so API Key is valid and connection successful!");
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
      {isLoading ? "Testing API Key..." : "Test Loop.so API Key"}
      {apiKeyStatus && (
        <span className={`ml-2 text-xs ${apiKeyStatus === "Valid" ? "text-green-500" : "text-red-500"}`}>
          ({apiKeyStatus})
        </span>
      )}
    </Button>
  );
}
