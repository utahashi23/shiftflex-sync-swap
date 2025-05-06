
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TestEmailButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  const handleTestEmail = async () => {
    try {
      setIsLoading(true);
      setApiStatus(null);
      toast.info("Testing Loop.so email service...");

      // Test API key first
      console.log("Testing Loop.so API key validity first...");
      const apiKeyResponse = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_api_key: true,
          to: "test@example.com",
          subject: "API Key Test",
          html: "<p>API key test</p>"
        }
      });

      console.log("API key test response:", apiKeyResponse);

      if (apiKeyResponse.error) {
        setApiStatus("API key invalid");
        toast.error(`API key test failed: ${apiKeyResponse.error.message || apiKeyResponse.error}`);
        console.error("API key test error details:", JSON.stringify(apiKeyResponse.error));
        setIsLoading(false);
        return;
      }

      setApiStatus("API key valid");
      toast.success("Loop.so API key is valid! Proceeding with test email...");

      // Now test email sending with the verified key
      console.log("Calling test_loop_email function...");
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: {}
      });

      console.log("Loop.so test response:", loopResponse);

      if (loopResponse.error) {
        toast.error(`Loop.so Test failed: ${loopResponse.error.message || loopResponse.error}`);
        console.error("Loop.so test error details:", JSON.stringify(loopResponse.error));
      } else {
        toast.success("Loop.so Test email sent! Check your inbox.");
      }
    } catch (error) {
      console.error("Error testing email:", error);
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
        <span className={`ml-2 text-xs ${apiStatus.includes("valid") ? "text-green-500" : "text-red-500"}`}>
          ({apiStatus})
        </span>
      )}
    </Button>
  );
}
