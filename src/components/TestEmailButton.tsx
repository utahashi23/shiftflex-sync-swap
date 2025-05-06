
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
      toast.info("Testing email service...");

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
          toast.error("API connection timed out. Trying alternative email service...");
          await tryAlternativeEmailService();
          return;
        } else if (errorMessage.includes("unreachable") || errorMessage.includes("sending request")) {
          setConnectionDetails("Network issue");
          toast.error("Primary API is unreachable. Switching to fallback service...");
          await tryAlternativeEmailService();
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
      toast.success("API connection successful! Proceeding with test email...");

      // Now test email sending with the verified key
      console.log("Calling test_loop_email function...");
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: {}
      });

      console.log("Test email response:", loopResponse);

      if (loopResponse.error) {
        setApiStatus("Email failed");
        
        // More specific error handling
        let errorMessage = loopResponse.error.message || String(loopResponse.error);
        
        if (errorMessage.includes("timeout")) {
          setConnectionDetails("Sending timeout");
          toast.error("Email sending timed out. Will try alternative service next time.");
        } else if (errorMessage.includes("validation")) {
          setConnectionDetails("Validation error");
          toast.error("Email validation failed. Please check your sending domain configuration.");
        } else {
          setConnectionDetails("Send error");
          toast.error(`Test email failed: ${errorMessage}`);
        }
        
        console.error("Test email error details:", JSON.stringify(loopResponse.error));
      } else {
        setApiStatus("Email sent");
        setConnectionDetails("Success");
        toast.success("Test email sent! Check your inbox for njalasankhulani@gmail.com.");
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

  // Function to attempt sending via an alternative email service
  const tryAlternativeEmailService = async () => {
    try {
      toast.info("Trying alternative email service...");
      console.log("Attempting to use fallback email service");
      
      // Call our fallback email service
      const fallbackResponse = await supabase.functions.invoke('send_email', {
        body: {
          to: "njalasankhulani@gmail.com",
          subject: "Email Test via Fallback Service",
          text: "This is a test email sent via the fallback email service.",
          from: "admin@shiftflex.au"
        }
      });
      
      console.log("Fallback email service response:", fallbackResponse);
      
      if (fallbackResponse.error) {
        setApiStatus("All services failed");
        setConnectionDetails("Network issue");
        toast.error("All email services failed. Please check your network configuration.");
        console.error("Fallback email service error:", fallbackResponse.error);
      } else {
        setApiStatus("Fallback worked");
        setConnectionDetails("Alternative service");
        toast.success("Test email sent via fallback service! Check your inbox.");
      }
    } catch (error) {
      console.error("Error using fallback email service:", error);
      setApiStatus("All attempts failed");
      setConnectionDetails("Critical error");
      toast.error("All email sending attempts failed. Please contact support.");
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
        <span className={`ml-2 text-xs ${apiStatus.includes("connected") || apiStatus.includes("sent") || apiStatus.includes("worked") ? "text-green-500" : "text-red-500"}`}>
          ({apiStatus}{connectionDetails ? `: ${connectionDetails}` : ""})
        </span>
      )}
    </Button>
  );
}
