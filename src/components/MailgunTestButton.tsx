
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);

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
      toast.info("Testing Mailgun email service...");

      // Try SDK approach first
      console.log("Testing Mailgun SDK integration...");
      const sdkResponse = await supabase.functions.invoke('test_mailgun_sdk', {
        body: { 
          timestamp: new Date().toISOString(),
          recipientEmail: recipientEmail 
        }
      });

      console.log("Mailgun SDK test response:", sdkResponse);

      if (sdkResponse.error) {
        console.error("Mailgun SDK test failed:", sdkResponse.error);
        
        // Store debug info
        setDebugInfo({
          errorType: 'sdk',
          response: sdkResponse,
          timestamp: new Date().toISOString()
        });
        
        // Try SMTP approach as fallback
        toast.warning("SDK approach failed, trying SMTP...");
        
        console.log("Testing Mailgun SMTP integration...");
        const smtpResponse = await supabase.functions.invoke('test_mailgun_smtp', {
          body: { 
            test_attempt: 1, 
            timestamp: new Date().toISOString(),
            recipientEmail: recipientEmail 
          }
        });
        
        console.log("Mailgun SMTP test response:", smtpResponse);
        
        if (smtpResponse.error) {
          const sdkErrorMessage = sdkResponse.error?.message || JSON.stringify(sdkResponse.error);
          const smtpErrorMessage = smtpResponse.error?.message || JSON.stringify(smtpResponse.error);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            smtpError: smtpResponse.error,
            smtpResponse: smtpResponse
          }));
          
          // If error message contains more detailed JSON error info, parse it for better display
          let formattedSdkError = sdkErrorMessage;
          try {
            // Check if the error message contains a JSON string with Mailgun error details
            if (sdkErrorMessage.includes('{') && sdkErrorMessage.includes('}')) {
              const errorJson = sdkErrorMessage.substring(
                sdkErrorMessage.indexOf('{'),
                sdkErrorMessage.lastIndexOf('}') + 1
              );
              const parsedError = JSON.parse(errorJson);
              formattedSdkError = `Status: ${parsedError.status || 'Unknown'}\nMessage: ${parsedError.message || 'Unknown'}\nDetails: ${parsedError.details || 'None'}`;
              
              // Set specific error type for better guidance
              if (parsedError.status === 401 || parsedError.message.includes('auth')) {
                formattedSdkError += "\n\nPossible cause: Authentication failed. Check your API key.";
              }
              if (parsedError.details && parsedError.details.includes('domain')) {
                formattedSdkError += "\n\nPossible cause: Domain validation issue. Check your domain configuration.";
              }
              if (parsedError.details && parsedError.details.includes('Network error')) {
                formattedSdkError += "\n\nPossible cause: Network restriction in Supabase Edge Functions.";
              }
            }
          } catch (e) {
            // If parsing fails, just use the original error message
            console.log("Error parsing SDK error details:", e);
          }
          
          const errorMsg = `Both SDK and SMTP approaches failed.`;
          setErrorDetails(`SDK Error:\n${formattedSdkError}\n\nSMTP Error:\n${smtpErrorMessage}`);
          throw new Error(errorMsg);
        } else {
          setTestResult("SMTP Success");
          toast.success(`Mailgun SMTP test successful! Email sent to ${recipientEmail}.`);
        }
      } else {
        setTestResult("SDK Success");
        toast.success(`Mailgun SDK test successful! Email sent to ${recipientEmail}.`);
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
    toast.info("Checking network connectivity...");
    
    try {
      const response = await supabase.functions.invoke('test_mailgun_sdk', {
        body: { 
          check_connectivity: true,
          timestamp: new Date().toISOString() 
        }
      });
      
      console.log("Connectivity check response:", response);
      
      if (response.error) {
        toast.error("Network connectivity check failed. This may indicate network restrictions in your Supabase project.");
      } else {
        toast.success("Network connectivity check passed. The issue might be with your Mailgun configuration.");
      }
    } catch (error) {
      console.error("Error checking connectivity:", error);
      toast.error("Network connectivity check failed due to an error.");
    } finally {
      setIsLoading(false);
    }
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
                <li>Ensure your Supabase project has proper network access</li>
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
                </div>
              </div>
            </div>
          )}
        </div>
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
