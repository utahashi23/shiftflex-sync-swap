
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TestEmailButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestEmail = async () => {
    try {
      setIsLoading(true);
      toast.info("Sending test email...");

      // Test using our SDK implementation
      const sdkResponse = await supabase.functions.invoke('test_mailgun_sdk', {
        body: {}
      });

      console.log("SDK test response:", sdkResponse);

      if (sdkResponse.error) {
        toast.error(`SDK Test failed: ${sdkResponse.error.message || sdkResponse.error}`);
        console.error("SDK test error:", sdkResponse.error);
      } else {
        toast.success("SDK Test email sent! Check your inbox.");
      }

      // Also test with the regular send_email function
      const regularResponse = await supabase.functions.invoke('send_email', {
        body: {
          to: "postmaster@shiftflex.au",
          subject: "Test Email via send_email function",
          html: `
            <h2>Testing Regular Send Email Function</h2>
            <p>This is a test email sent using the send_email Supabase Edge Function.</p>
            <p>If you're receiving this email, the email functionality is working correctly.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `
        }
      });

      console.log("Regular send_email response:", regularResponse);

      if (regularResponse.error) {
        toast.error(`Regular send_email failed: ${regularResponse.error.message || regularResponse.error}`);
        console.error("Regular send_email error:", regularResponse.error);
      } else {
        toast.success("Regular test email sent! Check your inbox.");
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
      {isLoading ? "Sending..." : "Test Email Functionality"}
    </Button>
  );
}
