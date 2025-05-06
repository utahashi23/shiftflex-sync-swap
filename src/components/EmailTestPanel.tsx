
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";
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
            </ul>
            <p className="text-sm">If you encounter issues, try using direct API approaches or consider using a service with dedicated Supabase integration.</p>
          </AlertDescription>
        </Alert>
        
        <p className="text-sm mb-4">
          Test the email service using both direct API and SMTP approaches.
          Check your inbox for the test emails.
        </p>
        
        <TestEmailButton />
        <SmtpTestButton />
      </CardContent>
    </Card>
  );
}
