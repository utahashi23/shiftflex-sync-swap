
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<'unknown' | 'checking' | 'restricted' | 'ok'>('unknown');

  const handleTestMailgun = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    try {
      setIsLoading(true);
      setTestResult(null);
      setErrorDetails(null);
      setDebugInfo(null);
      setNetworkStatus('unknown');
      toast.info("Testing Mailgun email service...");

      // First check network connectivity
      console.log("Checking network connectivity first...");
      try {
        const connectivityResponse = await supabase.functions.invoke('test_mailgun_sdk', {
          body: { 
            check_connectivity: true,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log("Network connectivity test response:", connectivityResponse);
        
        if (connectivityResponse.error || (connectivityResponse.data && !connectivityResponse.data.success)) {
          setNetworkStatus('restricted');
          toast.warning("Network connectivity issues detected. This may affect email sending.");
        } else {
          setNetworkStatus('ok');
        }
      } catch (connError) {
        console.error("Network check error:", connError);
        setNetworkStatus('restricted');
      }

      // Try direct API approach first
      console.log("Testing Mailgun direct API integration...");
      const apiResponse = await supabase.functions.invoke('test_mailgun_sdk', {
        body: { 
          timestamp: new Date().toISOString(),
          recipientEmail: recipientEmail,
          use_direct_api: true
        }
      });

      console.log("Mailgun API test response:", apiResponse);

      if (apiResponse.error) {
        console.error("Mailgun API test failed:", apiResponse.error);
        
        // Store debug info
        setDebugInfo({
          errorType: 'api',
          response: apiResponse,
          networkStatus,
          timestamp: new Date().toISOString()
        });
        
        // Extract and format the error message
        let formattedError = apiResponse.error?.message || JSON.stringify(apiResponse.error);
        
        try {
          if (typeof formattedError === 'string' && formattedError.includes('network restrictions')) {
            setErrorDetails(
              "Network restrictions detected in your Supabase project.\n\n" +
              "This is a common limitation with Supabase Edge Functions. " +
              "You can contact Supabase support to request external API access for your project, " +
              "or use an alternative email sending approach like webhooks or SMTP relay services " +
              "that are compatible with restricted network environments.\n\n" +
              `Original error: ${formattedError}`
            );
          } else if (formattedError.includes('{') && formattedError.includes('}')) {
            // Try to extract the JSON error details
            const errorJson = formattedError.substring(
              formattedError.indexOf('{'),
              formattedError.lastIndexOf('}') + 1
            );
            const parsedError = JSON.parse(errorJson);
            formattedError = `Status: ${parsedError.status || 'Unknown'}\nMessage: ${parsedError.message || 'Unknown'}\nDetails: ${parsedError.details || 'None'}`;
          }
        } catch (parseError) {
          console.log("Error parsing error details:", parseError);
        }
        
        setErrorDetails(formattedError);
        setTestResult("Failed");
        toast.error(`Mailgun test failed: Network restrictions or configuration issue`);
      } else {
        setTestResult(apiResponse.data?.method === "direct_api" ? "Direct API Success" : "SDK Success");
        toast.success(`Mailgun test successful! Email sent to ${recipientEmail} using ${apiResponse.data?.method === "direct_api" ? "direct API" : "SDK"}.`);
      }
    } catch (error) {
      console.error("Error testing Mailgun:", error);
      setTestResult("Failed");
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Mailgun test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkNetworkConnectivity = async () => {
    setIsLoading(true);
    setNetworkStatus('checking');
    toast.info("Checking network connectivity...");
    
    try {
      const response = await supabase.functions.invoke('test_mailgun_sdk', {
        body: { 
          check_connectivity: true,
          timestamp: new Date().toISOString() 
        }
      });
      
      console.log("Connectivity check response:", response);
      
      if (response.error || (response.data && !response.data.success)) {
        setNetworkStatus('restricted');
        toast.error("Network connectivity check failed. The network restrictions in your Supabase project are likely preventing external API connections.");
        
        setErrorDetails(
          "Network restrictions detected.\n\n" +
          "Your Supabase Edge Functions are currently unable to connect to external APIs. " +
          "This is a common limitation in the free and starter plans of Supabase.\n\n" +
          "Possible solutions:\n" +
          "1. Upgrade to a higher Supabase plan that allows external API connections\n" +
          "2. Contact Supabase support to request external API access for your project\n" +
          "3. Use a webhook integration or middleware service instead of direct API calls\n" +
          "4. Consider using an SMTP relay service that works with restricted environments"
        );
      } else {
        setNetworkStatus('ok');
        toast.success("Network connectivity check passed. Your Edge Functions can connect to external APIs.");
        
        // If we have network connectivity but still had email sending errors,
        // it's likely a configuration issue
        if (testResult === "Failed") {
          setErrorDetails(
            "Network connectivity is working, but email sending failed.\n\n" +
            "This indicates a configuration issue rather than a network restriction:\n\n" +
            "1. Verify your Mailgun API key is correct\n" +
            "2. Confirm your domain is properly verified in Mailgun\n" +
            "3. Check if you need to use the EU region endpoint (see the Edge Function code)\n" +
            "4. Make sure your sending address is authorized for your Mailgun domain"
          );
        }
      }
    } catch (error) {
      console.error("Error checking connectivity:", error);
      setNetworkStatus('restricted');
      toast.error("Network connectivity check failed due to an error.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderNetworkStatusIndicator = () => {
    if (networkStatus === 'unknown') {
      return null;
    }
    
    return (
      <div className="mt-2 flex items-center">
        <div className={`h-3 w-3 rounded-full mr-2 ${
          networkStatus === 'checking' ? 'bg-yellow-500' :
          networkStatus === 'ok' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-xs">
          Network status: {
            networkStatus === 'checking' ? 'Checking...' :
            networkStatus === 'ok' ? 'External API access available' : 
            'Network restrictions detected'
          }
        </span>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <Label htmlFor="recipient-email" className="mb-2 block">
          Recipient Email
        </Label>
        <Input
          id="recipient-email"
          type="email"
          placeholder="Enter recipient email address"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="mb-2"
        />
        {renderNetworkStatusIndicator()}
      </div>
      
      <Button 
        onClick={handleTestMailgun}
        disabled={isLoading || !recipientEmail}
        variant="default"
        className="w-full mt-2"
      >
        {isLoading ? "Testing Mailgun..." : "Test Mailgun Service"}
        {testResult && (
          <span className={`ml-2 text-xs ${
            testResult.includes("Success") ? "text-green-500" : "text-red-500"
          }`}>
            ({testResult})
          </span>
        )}
      </Button>
      
      {errorDetails && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-mono whitespace-pre-wrap">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold">Error Details:</p>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-5 text-xs"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? "Hide Config Help" : "Show Config Help"}
            </Button>
          </div>
          {errorDetails}
          
          <div className="mt-3 flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={checkNetworkConnectivity}
              disabled={isLoading}
            >
              Check Network Connectivity
            </Button>
          </div>
          
          {showSettings && (
            <div className="mt-3 pt-2 border-t border-red-200">
              <p className="font-medium mb-1">Configuration Steps:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Go to Supabase Dashboard {'->'} Edge Functions {'->'} Settings</li>
                <li>Check or update your MAILGUN_API_KEY</li>
                <li>Check or update your MAILGUN_DOMAIN (should be your verified domain)</li>
                <li>Make sure your domain is properly verified in Mailgun</li>
              </ol>
              
              <div className="mt-3 flex items-start space-x-2 p-2 bg-blue-50 rounded">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800">
                    <strong>Common issues:</strong>
                  </p>
                  <ul className="list-disc ml-4 text-xs text-blue-800 mt-1 space-y-1">
                    <li>Supabase Edge Functions have network restrictions that may prevent connections to external APIs</li>
                    <li>Mailgun API keys must be valid and active</li>
                    <li>The domain must be properly verified in Mailgun</li>
                    <li>Check if you need to use the EU endpoint (uncomment the EU URL line in the function)</li>
                  </ul>
                  
                  <a 
                    href="https://supabase.com/docs/guides/functions/connect-to-postgres#network-restrictions" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center text-xs text-blue-600 hover:underline"
                  >
                    Learn more about Edge Function network restrictions
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {networkStatus === 'restricted' && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Network restrictions detected.</strong> Supabase Edge Functions on free and starter plans typically cannot access external APIs without special permission. You may need to contact Supabase support to request external API access for your project.
          </AlertDescription>
        </Alert>
      )}
      
      {debugInfo && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer">Show Debug Information</summary>
          <pre className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
