
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

      // Test using our Loop.so implementation
      const loopResponse = await supabase.functions.invoke('test_loop_email', {
        body: {}
      });

      console.log("Loop.so test response:", loopResponse);

      if (loopResponse.error) {
        toast.error(`Loop.so Test failed: ${loopResponse.error.message || loopResponse.error}`);
        console.error("Loop.so test error:", loopResponse.error);
      } else {
        toast.success("Loop.so Test email sent! Check your inbox.");
      }

      // Also test with the regular loop_send_email function
      const regularResponse = await supabase.functions.invoke('loop_send_email', {
        body: {
          to: "njalasankhulani@gmail.com",
          subject: "Test Email via Loop.so API",
          from: "admin@shiftflex.au",
          html: `
            <h2>Testing Loop.so Email API</h2>
            <p>This is a test email sent using the Loop.so email service.</p>
            <p>If you're receiving this email, the email functionality is working correctly.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `
        }
      });

      console.log("Regular Loop.so email response:", regularResponse);

      if (regularResponse.error) {
        toast.error(`Regular Loop.so email failed: ${regularResponse.error.message || regularResponse.error}`);
        console.error("Regular Loop.so email error:", regularResponse.error);
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
