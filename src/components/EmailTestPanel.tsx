
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";
import { MailgunTestButton } from "@/components/MailgunTestButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
          <AlertTitle>Supabase Edge Functions and External Services</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Edge Functions may have limitations when connecting to external services:</p>
            <ul className="list-disc pl-5 mb-2 text-sm">
              <li>DNS resolution issues can prevent connections to domain names</li>
              <li>Some services may require explicit IP allowlisting</li>
              <li>Connection timeouts may occur due to environment constraints</li>
              <li>API credentials may be incorrect or expired</li>
            </ul>
            <p className="text-sm">If you encounter issues, check your API credentials in the Supabase dashboard and verify your domain settings with the email provider.</p>
          </AlertDescription>
        </Alert>
        
        <p className="text-sm mb-4">
          Test the email service using different providers and approaches.
          Check your inbox for test emails or review error details below.
        </p>
        
        <div className="space-y-4">
          <TestEmailButton />
          <SmtpTestButton />
          <MailgunTestButton />
        </div>
      </CardContent>
    </Card>
  );
}
