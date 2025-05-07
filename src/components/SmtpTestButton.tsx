
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

interface SmtpTestButtonProps {
  recipientEmail: string;
}

export function SmtpTestButton({ recipientEmail }: SmtpTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  const handleTestSmtp = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setStatusDetail(null);
      toast.info("Testing SMTP connection...");
      
      console.log(`Testing SMTP with recipient email: ${recipientEmail}`);

      // First try the Loop.so SMTP
      const loopSmtpResponse = await supabase.functions.invoke('test_loopso_smtp', {
        body: { 
          recipientEmail,
          test_attempt: 1,
          timestamp: new Date().toISOString(),
          verbose_logging: true 
        }
      });
      
      console.log("Loop.so SMTP test response:", loopSmtpResponse);
      
      if (!loopSmtpResponse.error) {
        setTestStatus("Connected");
        setStatusDetail("Loop.so SMTP");
        toast.success("Loop.so SMTP connection successful! Test email sent.");
        return;
      }
      
      console.log("Loop.so SMTP test failed, trying Mailgun SMTP...");
      
      // Try Mailgun SMTP as fallback
      const mailgunSmtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
        body: { 
          recipientEmail,
          test_attempt: 1,
          timestamp: new Date().toISOString(),
          verbose_logging: true 
        }
      });
      
      console.log("Mailgun SMTP test response:", mailgunSmtpResponse);
      
      if (!mailgunSmtpResponse.error) {
        setTestStatus("Connected");
        setStatusDetail("Mailgun SMTP");
        toast.success("Mailgun SMTP connection successful! Test email sent.");
      } else {
        setTestStatus("Failed");
        
        // Determine the cause of failure
        const loopError = loopSmtpResponse.error instanceof Error 
          ? loopSmtpResponse.error.message 
          : String(loopSmtpResponse.error);
          
        const mailgunError = mailgunSmtpResponse.error instanceof Error 
          ? mailgunSmtpResponse.error.message 
          : String(mailgunSmtpResponse.error);
          
        if (loopError.includes("network") || loopError.includes("dns") || mailgunError.includes("network") || mailgunError.includes("bufio")) {
          setStatusDetail("Network restrictions");
          toast.error("SMTP connections failed due to network restrictions in Supabase Edge Functions.");
        } else if (loopError.includes("auth") || mailgunError.includes("auth")) {
          setStatusDetail("Authentication failed");
          toast.error("SMTP authentication failed. Please check your credentials.");
        } else {
          setStatusDetail("Connection error");
          toast.error("SMTP connections failed. See console for details.");
        }
        
        console.error("Loop.so SMTP Error:", loopError);
        console.error("Mailgun SMTP Error:", mailgunError);
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      setTestStatus("Error");
      setStatusDetail("Exception");
      toast.error(`Error testing SMTP: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestSmtp}
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Testing...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Test SMTP Connection
        </>
      )}
      {testStatus && (
        <span className={`ml-2 text-xs ${testStatus === "Connected" ? "text-green-500" : "text-red-500"}`}>
          ({testStatus}{statusDetail ? `: ${statusDetail}` : ""})
        </span>
      )}
    </Button>
  );
}
