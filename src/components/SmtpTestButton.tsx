
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SmtpTestButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestSmtp = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing SMTP connection...");

      const response = await supabase.functions.invoke('test_mailgun_smtp', {
        body: {}
      });

      console.log("SMTP test response:", response);

      if (response.error) {
        toast.error(`SMTP Test failed: ${response.error.message || response.error}`);
        console.error("SMTP test error:", response.error);
      } else {
        toast.success("SMTP Test email sent! Check your inbox.");
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      toast.error(`Error testing SMTP: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestSmtp}
      disabled={isLoading}
      variant="outline"
      className="w-full mt-2"
    >
      {isLoading ? "Testing..." : "Test SMTP Connection"}
    </Button>
  );
}
