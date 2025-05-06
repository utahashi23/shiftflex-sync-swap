
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
        setApiStatus("Connection failed");
        
        // More specific error handling
        let errorMessage = apiKeyResponse.error.message || String(apiKeyResponse.error);
        
        if (errorMessage.includes("timeout")) {
          toast.error("Loop.so API connection timed out. Please check your network connection.");
          console.error("API key test error details:", JSON.stringify(apiKeyResponse.error));
          setIsLoading(false);
          return;
        } else if (errorMessage.includes("unreachable")) {
          toast.error("Loop.so API is unreachable. Please check your network connection.");
          console.error("API key test error details:", JSON.stringify(apiKeyResponse.error));
          setIsLoading(false);
          return;
        } else {
          toast.error(`API key test failed: ${errorMessage}`);
          console.error("API key test error details:", JSON.stringify(apiKeyResponse.error));
          setIsLoading(false);
          return;
        }
      }

      setApiStatus("API connected");
      toast.success("Loop.so API connection successful! Proceeding with test email...");

      // Now test email sending with the verified key
      console.log("Calling test_loop_email function...");
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: {}
      });

      console.log("Loop.so test response:", loopResponse);

      if (loopResponse.error) {
        setApiStatus("Email failed");
        
        // More specific error handling
        let errorMessage = loopResponse.error.message || String(loopResponse.error);
        
        if (errorMessage.includes("timeout")) {
          toast.error("Email sending timed out. This could be due to network issues.");
        } else if (errorMessage.includes("validation")) {
          toast.error("Email validation failed. Please check your sending domain configuration in Loop.so.");
        } else {
          toast.error(`Loop.so Test failed: ${errorMessage}`);
        }
        
        console.error("Loop.so test error details:", JSON.stringify(loopResponse.error));
      } else {
        setApiStatus("Email sent");
        toast.success("Loop.so Test email sent! Check your inbox for njalasankhulani@gmail.com.");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      setApiStatus("Error");
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
          ({apiStatus})
        </span>
      )}
    </Button>
  );
}
