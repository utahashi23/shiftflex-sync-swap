
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
          Test the Loop.so email functionality using different approaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          Test the Loop.so email service using standard and direct API approaches.
          Check your inbox for the test emails.
        </p>
        <TestEmailButton />
        <SmtpTestButton />
      </CardContent>
    </Card>
  );
}
