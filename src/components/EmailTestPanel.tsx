
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function EmailTestPanel() {
  const [debugMode, setDebugMode] = useState(false);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Email Testing</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDebugMode(!debugMode)}
            className="text-xs"
          >
            {debugMode ? "Hide Debug Info" : "Show Debug Info"}
          </Button>
        </CardTitle>
        <CardDescription>
          Test the email functionality using different approaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Connection Troubleshooting</AlertTitle>
          <AlertDescription>
            If connection fails, the system will attempt to use a fallback email service. Common issues include network restrictions on Supabase Edge Functions or API key format problems.
          </AlertDescription>
        </Alert>
        
        {debugMode && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Network Debugging</AlertTitle>
            <AlertDescription className="text-sm">
              <p className="mb-2">The Loop.so API requires outbound access on port 443 (HTTPS) to api.loop.so.</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>Edge Function logs show successful connections to Google and Cloudflare</li>
                <li>Connection to Loop.so API appears to be blocked specifically</li>
                <li>This suggests a targeted network restriction on the Supabase Edge Function environment</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-sm mb-4">
          Test the email service using both direct and fallback approaches.
          Check your inbox for the test emails.
        </p>
        
        <TestEmailButton />
        
        <Separator className="my-4" />
        
        <SmtpTestButton />
        
        {debugMode && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <RefreshCcw className="h-3 w-3 mr-1" /> Diagnostic Information
            </h4>
            <div className="text-xs space-y-1 text-gray-700">
              <p>• Loop API Key length: 32 characters</p>
              <p>• Loop API Key format: Check - should be alphanumeric only</p>
              <p>• Sending domain: shiftflex.au</p>
              <p>• Tested reachable domains: google.com, cloudflare.com</p>
              <p>• Tested unreachable domains: api.loop.so</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
