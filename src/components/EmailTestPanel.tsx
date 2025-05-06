
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
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Connection Troubleshooting</AlertTitle>
          <AlertDescription>
            If connection fails, the system will attempt to use a fallback email service. Common issues include network restrictions on Supabase Edge Functions or API key format problems.
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
