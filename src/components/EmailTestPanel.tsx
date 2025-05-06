
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

export function EmailTestPanel() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
        <CardDescription>
          Test the email functionality using different approaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-amber-500">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Network Restriction Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Your Supabase project has network restrictions configured that are limiting outbound connections from Edge Functions:</p>
            <ul className="list-disc pl-5 mb-2 text-sm">
              <li>Only IPv4 addresses in range 183.12.1.1/24 are allowed</li>
              <li>Only IPv6 addresses in range 2001:db8:3333:4444:5555:6666:7777:8888/64 are allowed</li>
            </ul>
            <p className="text-sm">These restrictions prevent Edge Functions from connecting to external services like Loop.so.</p>
          </AlertDescription>
        </Alert>
        
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>How to Fix Network Restrictions</AlertTitle>
          <AlertDescription>
            To allow Edge Functions to connect to external services, you need to remove or modify the network restrictions in your Supabase project settings using the Supabase CLI command: <code className="bg-gray-100 px-1 py-0.5 rounded">supabase network-restrictions --project-ref {'{ref}'} delete --experimental</code>
          </AlertDescription>
        </Alert>
        
        <p className="text-sm mb-4">
          Test the email service using both direct and fallback approaches.
          Check your inbox for the test emails.
        </p>
        
        <TestEmailButton />
        <SmtpTestButton />
      </CardContent>
    </Card>
  );
}
