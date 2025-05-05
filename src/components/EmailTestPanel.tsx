
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";

export function EmailTestPanel() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
        <CardDescription>
          Test the email functionality using API and SMTP approaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          Test the Mailgun API using the SDK and direct API approaches, or test the SMTP connection.
          Check your inbox for the test emails.
        </p>
        <TestEmailButton />
        <SmtpTestButton />
      </CardContent>
    </Card>
  );
}
