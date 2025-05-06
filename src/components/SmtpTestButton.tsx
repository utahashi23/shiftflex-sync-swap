
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestLoop = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing Loop.so direct API...");
      console.log("Calling loop_send_email with direct parameters");

      const response = await supabase.functions.invoke('loop_send_email', {
        body: {
          to: "njalasankhulani@gmail.com",
          subject: "Loop.so Direct API Test",
          html: `
            <h2>Loop.so Direct API Test</h2>
            <p>This is a test email sent directly using the Loop.so API from a Supabase Edge Function.</p>
            <p>If you're receiving this email, the Loop.so integration is working correctly.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          `,
          from: "admin@shiftflex.au"
        }
      });

      console.log("Loop.so direct test response:", response);

      if (response.error) {
        toast.error(`Loop.so Direct Test failed: ${response.error.message || response.error}`);
        console.error("Loop.so direct test error:", response.error);
      } else {
        toast.success("Loop.so Direct Test email sent! Check your inbox.");
      }
    } catch (error) {
      console.error("Error testing Loop.so:", error);
      toast.error(`Error testing Loop.so: ${error.message || "Unknown error"}`);
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
      {isLoading ? "Testing..." : "Test Loop.so Direct API"}
    </Button>
  );
}
