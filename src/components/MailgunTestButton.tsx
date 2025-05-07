
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Check, Network } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [recipientEmail, setRecipientEmail] = useState("njalasankhulani@gmail.com");
  const [networkLogs, setNetworkLogs] = useState<Array<{time: string, message: string, type: 'request'|'response'|'error'|'info'}>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper function to add logs
  const addLog = (message: string, type: 'request'|'response'|'error'|'info') => {
    setNetworkLogs(prev => [...prev, {
      time: new Date().toISOString().split('T')[1].split('.')[0],
      message,
      type
    }]);
    
    // Scroll to bottom of logs
    setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };
  
  const clearLogs = () => {
    setNetworkLogs([]);
  };

  const handleTestMailgun = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setConnectionDetails(null);
      setShowError(false);
      clearLogs();
      toast.info("Testing Mailgun connection (US region)...");
      
      addLog("Starting Mailgun API test (US region)", "info");
      addLog(`Recipient email: ${recipientEmail}`, "info");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      // Call the API test function first (more likely to succeed with network restrictions)
      addLog(`Sending request to test_mailgun_sdk function (attempt ${currentRetry})`, "request");
      const response = await supabase.functions.invoke('test_mailgun_sdk', {
        body: {
          recipientEmail: recipientEmail,
          test_attempt: currentRetry,
          timestamp: new Date().toISOString(),
          region: "US",
          verbose_logging: true
        }
      });

      if (response.data) {
        addLog(`Response received: ${JSON.stringify(response.data)}`, "response");
      }
      
      if (response.error) {
        addLog(`Error response: ${JSON.stringify(response.error)}`, "error");
      }

      console.log(`Mailgun API test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        // If API test fails, try SMTP as fallback
        addLog("API test failed, trying SMTP as fallback", "info");
        const smtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
          body: {
            recipientEmail: recipientEmail,
            test_attempt: currentRetry,
            timestamp: new Date().toISOString(),
            verbose_logging: true
          }
        });
        
        if (smtpResponse.data) {
          addLog(`SMTP response received: ${JSON.stringify(smtpResponse.data)}`, "response");
        }
        
        if (smtpResponse.error) {
          addLog(`SMTP error response: ${JSON.stringify(smtpResponse.error)}`, "error");
        }
        
        console.log(`Mailgun SMTP test response:`, smtpResponse);
        
        if (smtpResponse.error) {
          setTestStatus("Connection failed");
          const errorMessage = smtpResponse.error instanceof Error 
            ? smtpResponse.error.message 
            : String(smtpResponse.error);
          
          if (errorMessage.includes("authentication")) {
            setConnectionDetails("Auth failed");
            setShowError(true);
            toast.error("SMTP authentication failed. Please verify the credentials.");
          } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection")) {
            setConnectionDetails("Network restriction");
            setShowError(true);
            toast.error("Network restriction detected. This is a common issue with Supabase Edge Functions.");
          } else {
            setConnectionDetails("Error");
            toast.error(`Mailgun test failed: ${errorMessage}`);
          }
        } else {
          setTestStatus("Connected");
          setConnectionDetails(smtpResponse.data?.message || "SMTP working");
          toast.success("Mailgun SMTP connection successful! Test email sent.");
        }
      } else {
        // API test successful
        setTestStatus("Connected");
        setConnectionDetails(response.data?.message || "API working");
        toast.success("Mailgun API connection successful! Test email sent via US region.");
      }
    } catch (error) {
      console.error("Error testing Mailgun:", error);
      setTestStatus("Error");
      setConnectionDetails("Test failed");
      setShowError(true);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Exception: ${errorMessage}`, "error");
      toast.error(`Error testing Mailgun: ${errorMessage || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="recipient-email" className="text-sm font-medium">
          Recipient Email
        </label>
        <div className="flex space-x-2">
          <Input 
            id="recipient-email"
            type="email" 
            value={recipientEmail} 
            onChange={(e) => setRecipientEmail(e.target.value)} 
            placeholder="Enter recipient email"
            className="flex-1"
          />
          <Button 
            onClick={handleTestMailgun}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Network className="mr-2 h-4 w-4" />
                Test Mailgun API
              </>
            )}
          </Button>
        </div>
        {testStatus && (
          <div className={`text-xs px-2 py-1 rounded-md ${testStatus === "Connected" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {testStatus === "Connected" ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
            Status: {testStatus}{connectionDetails ? `: ${connectionDetails}` : ""}
          </div>
        )}
      </div>

      {showError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection to Mailgun server (US region) failed. This may be due to network restrictions in Supabase Edge Functions.
            The test was attempted with your configured API key on the US region endpoint.
          </AlertDescription>
        </Alert>
      )}
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="network-logs">
          <AccordionTrigger className="text-sm">
            Network Activity Logs ({networkLogs.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="bg-gray-50 border rounded-md p-2 max-h-80 overflow-auto text-xs font-mono">
              {networkLogs.length === 0 ? (
                <div className="text-gray-500 p-2">No logs yet. Run a test to see network activity.</div>
              ) : (
                networkLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`p-1 border-l-2 ${
                      log.type === 'request' ? 'border-blue-400 bg-blue-50' : 
                      log.type === 'response' ? 'border-green-400 bg-green-50' : 
                      log.type === 'error' ? 'border-red-400 bg-red-50' : 
                      'border-gray-400 bg-gray-50'
                    }`}
                  >
                    <span className="text-gray-500 mr-2">[{log.time}]</span>
                    <span className={`mr-2 px-1 rounded text-xs ${
                      log.type === 'request' ? 'bg-blue-200 text-blue-800' : 
                      log.type === 'response' ? 'bg-green-200 text-green-800' : 
                      log.type === 'error' ? 'bg-red-200 text-red-800' : 
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {log.type.toUpperCase()}
                    </span>
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
            <div className="mt-2 text-right">
              <Button variant="ghost" size="sm" onClick={clearLogs} disabled={networkLogs.length === 0}>
                Clear Logs
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
