
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestEmailButtonProps {
  recipientEmail: string;
}

export function TestEmailButton({ recipientEmail }: TestEmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);

  const handleTestEmail = async () => {
    try {
      setIsLoading(true);
      setApiStatus(null);
      setConnectionDetails(null);
      toast.info("Testing email service...");

      console.log(`Testing Loop.so email with recipient: ${recipientEmail}`);

      // Test API connectivity first
      console.log("Testing Loop.so API connectivity first...");
      const connectivityResponse = await supabase.functions.invoke('loop_send_email', {
        body: {
          test_connectivity: true,
          test_api_key: true,
          to: recipientEmail,
          subject: "Connectivity Test",
          html: "<p>Connectivity test</p>"
        }
      });

      console.log("API connectivity test response:", connectivityResponse);

      if (connectivityResponse.error) {
        setApiStatus("Connection failed");
        
        // More specific error handling
        const errorMessage = connectivityResponse.error instanceof Error 
          ? connectivityResponse.error.message 
          : String(connectivityResponse.error);
        
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
          setConnectionDetails("Network restriction");
          toast.error(`API connectivity test failed: Network restrictions are preventing connections`);
          console.error("API connectivity test error details:", JSON.stringify(connectivityResponse.error));
          setIsLoading(false);
          return;
        }
      }

      setApiStatus("API connected");
      setConnectionDetails(connectivityResponse.data?.details || "API reachable");
      toast.success("API connection successful! Proceeding with test email...");

      // Now test email sending with the verified key
      console.log(`Calling test_loop_email function with recipient: ${recipientEmail}`);
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: { recipientEmail }
      });

      console.log("Test email response:", loopResponse);

      if (loopResponse.error) {
        setApiStatus("Email failed");
        
        // More specific error handling
        const errorMessage = loopResponse.error instanceof Error 
          ? loopResponse.error.message 
          : String(loopResponse.error);
        
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
        toast.success(`Test email sent! Check your inbox for ${recipientEmail}.`);
      }
    } catch (error) {
      console.error("Error testing email:", error);
      setApiStatus("Error");
      setConnectionDetails("Network restriction");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Error testing email: ${errorMessage || "Network restrictions preventing connections"}`);
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
          to: recipientEmail,
          subject: "Email Test via Fallback Service",
          text: "This is a test email sent via the fallback email service.",
          from: "admin@shiftflex.au"
        }
      });
      
      console.log("Fallback email service response:", fallbackResponse);
      
      if (fallbackResponse.error) {
        setApiStatus("All services failed");
        setConnectionDetails("Network restriction");
        toast.error("All email services failed due to network restrictions. Please modify your Supabase network settings.");
        console.error("Fallback email service error:", fallbackResponse.error);
      } else {
        setApiStatus("Fallback worked");
        setConnectionDetails("Alternative service");
        toast.success("Test email sent via fallback service! Check your inbox.");
      }
    } catch (error) {
      console.error("Error using fallback email service:", error);
      setApiStatus("All attempts failed");
      setConnectionDetails("Network restrictions");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`All email sending attempts failed due to network restrictions: ${errorMessage}`);
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
