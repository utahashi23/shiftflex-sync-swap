
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Check, Network, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

interface MailgunTestButtonProps {
  recipientEmail: string;
  showAdvanced?: boolean;
}

export function MailgunTestButton({ recipientEmail, showAdvanced = false }: MailgunTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkLogs, setNetworkLogs] = useState<Array<{time: string, message: string, type: 'request'|'response'|'error'|'info'}>>([]);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [edgeFunctionError, setEdgeFunctionError] = useState<any>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper function to add logs
  const addLog = (message: string, type: 'request'|'response'|'error'|'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setNetworkLogs(prev => [...prev, {
      time: timestamp,
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
    setErrorDetails(null);
    setEdgeFunctionError(null);
    setEnvironmentInfo(null);
  };

  // Fetch environment information to help debug issues
  const fetchEnvironmentInfo = async () => {
    try {
      addLog("Fetching Mailgun environment configuration...", "request");
      
      const response = await supabase.functions.invoke('test_mailgun_environment', {
        body: {}
      });
      
      if (response.error) {
        addLog(`Environment check error: ${JSON.stringify(response.error)}`, "error");
        return;
      }
      
      addLog("Environment information received", "response");
      setEnvironmentInfo(response.data);
      
      // Log domain format validation
      if (response.data?.domain_format_valid === false) {
        addLog(`⚠️ DOMAIN FORMAT INVALID: ${response.data?.domain || 'Not set'}`, "error");
      } else if (response.data?.domain) {
        addLog(`Domain format valid: ${response.data.domain}`, "info");
      }
      
      // Log API key validation
      if (response.data?.api_key_format_valid === false) {
        addLog(`⚠️ API KEY FORMAT INVALID`, "error");
      } else if (response.data?.api_key_format_valid) {
        addLog(`API key format appears valid`, "info");
      }
    } catch (err) {
      addLog(`Environment fetch error: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

  const handleTestMailgun = async () => {
    try {
      setIsLoading(true);
      setTestStatus(null);
      setConnectionDetails(null);
      setShowError(false);
      setErrorDetails(null);
      setEdgeFunctionError(null);
      clearLogs();
      toast.info("Testing Mailgun connection (US region)...");
      
      addLog("Starting Mailgun API test (US region)", "info");
      addLog(`Recipient email: ${recipientEmail}`, "info");

      // Add a retry count for diagnostic purposes
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);
      
      // First, fetch environment information
      await fetchEnvironmentInfo();

      // Check connectivity to see if network restrictions might be an issue
      addLog("Testing basic connectivity to Mailgun servers...", "request");
      try {
        const connectivityCheck = await supabase.functions.invoke('test_mailgun_sdk', {
          body: {
            check_connectivity: true,
            timestamp: new Date().toISOString()
          }
        });
        
        if (connectivityCheck.error) {
          addLog(`Connectivity check failed: ${JSON.stringify(connectivityCheck.error)}`, "error");
          setEdgeFunctionError(connectivityCheck.error);
          
          // Try to extract more details from the error
          const errorMessage = connectivityCheck.error instanceof Error 
            ? connectivityCheck.error.message 
            : typeof connectivityCheck.error === 'string' 
              ? connectivityCheck.error
              : JSON.stringify(connectivityCheck.error);
              
          setErrorDetails(`Connectivity error: ${errorMessage}`);
        } else {
          addLog(`Connectivity check result: ${JSON.stringify(connectivityCheck.data)}`, "response");
        }
      } catch (connectivityError) {
        addLog(`Connectivity check exception: ${connectivityError instanceof Error ? connectivityError.message : String(connectivityError)}`, "error");
      }

      // Call the API test function first (more likely to succeed with network restrictions)
      addLog(`Sending request to test_mailgun_sdk function (attempt ${currentRetry})`, "request");
      addLog(`Request payload: ${JSON.stringify({
        recipientEmail,
        test_attempt: currentRetry,
        timestamp: new Date().toISOString(),
        region: "US",
        verbose_logging: true
      })}`, "info");
      
      const response = await supabase.functions.invoke('test_mailgun_sdk', {
        body: {
          recipientEmail,
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
        setEdgeFunctionError(response.error);
        
        // Try to extract more details from the error
        if (typeof response.error === 'object') {
          setErrorDetails(JSON.stringify(response.error, null, 2));
        } else {
          setErrorDetails(String(response.error));
        }
      }

      console.log(`Mailgun API test response (Attempt ${currentRetry}):`, response);

      if (response.error) {
        // If API test fails, try SMTP as fallback
        addLog("API test failed, trying SMTP as fallback", "info");
        const smtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
          body: {
            recipientEmail,
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
          
          // Store the SMTP error for display
          if (!edgeFunctionError) {
            setEdgeFunctionError(smtpResponse.error);
          }
          
          // Try to extract more details from the SMTP error
          if (typeof smtpResponse.error === 'object') {
            setErrorDetails((prev) => `${prev ? prev + '\n\n' : ''}SMTP Error:\n${JSON.stringify(smtpResponse.error, null, 2)}`);
          } else {
            setErrorDetails((prev) => `${prev ? prev + '\n\n' : ''}SMTP Error:\n${String(smtpResponse.error)}`);
          }
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
          } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("connection") || errorMessage.includes("bufio")) {
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
      setErrorDetails(`Exception: ${errorMessage}`);
      toast.error(`Error testing Mailgun: ${errorMessage || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button 
          onClick={handleTestMailgun}
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

      {showError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection to Mailgun server (US region) failed. This may be due to network restrictions in Supabase Edge Functions
            or misconfigured API credentials.
          </AlertDescription>
        </Alert>
      )}
      
      {edgeFunctionError && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Edge Function Error: {edgeFunctionError.name || 'Unknown error'}
            {edgeFunctionError.message && <p className="text-xs mt-1">{edgeFunctionError.message}</p>}
          </AlertDescription>
        </Alert>
      )}
      
      {environmentInfo && showAdvanced && (
        <Card className="mt-2 bg-slate-50">
          <CardContent className="p-3 pt-3">
            <div className="text-xs font-semibold mb-1">Environment Info:</div>
            <div className="text-xs space-y-1">
              <div>
                Domain: {environmentInfo.domain_format_valid ? 
                  <span className="text-green-600">{environmentInfo.domain || 'Not set'}</span> : 
                  <span className="text-red-600">{environmentInfo.domain || 'Invalid or not set'}</span>}
              </div>
              <div>
                API Key: {environmentInfo.api_key_format_valid ? 
                  <span className="text-green-600">Valid format</span> : 
                  <span className="text-red-600">Invalid format</span>}
              </div>
              {environmentInfo.domain_issues && (
                <div className="text-red-600">
                  Domain issue: {environmentInfo.domain_issues}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {errorDetails && showAdvanced && (
        <div className="mt-2">
          <div className="text-xs font-semibold mb-1">Error Details:</div>
          <pre className="bg-gray-50 border rounded-md p-2 text-xs overflow-auto max-h-40">
            {errorDetails}
          </pre>
        </div>
      )}
      
      <Accordion type="single" collapsible className="w-full" defaultValue={showAdvanced ? "network-logs" : undefined}>
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
