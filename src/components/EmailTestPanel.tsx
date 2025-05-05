
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";

export function EmailTestPanel() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
        <CardDescription>
          Test the email functionality using both Mailgun SDK and direct API approaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          Click the button below to send test emails using both the Mailgun SDK and the direct API approach.
          Check your inbox for the test emails.
        </p>
        <TestEmailButton />
      </CardContent>
    </Card>
  );
}
