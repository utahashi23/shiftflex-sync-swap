
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestEmailButton } from "@/components/TestEmailButton";
import { SmtpTestButton } from "@/components/SmtpTestButton";
import { MailgunTestButton } from "@/components/MailgunTestButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EmailTestPanel() {
  const [recipientEmail, setRecipientEmail] = useState("njalasankhulani@gmail.com");
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
        <CardDescription>
          Test the email functionality using different providers and approaches
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
        
        <div className="mb-4">
          <label htmlFor="recipient-email" className="text-sm font-medium block mb-1">
            Recipient Email
          </label>
          <div className="flex space-x-2">
            <Input 
              id="recipient-email"
              type="email" 
              value={recipientEmail} 
              onChange={(e) => setRecipientEmail(e.target.value)} 
              placeholder="Enter recipient email"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </Button>
          </div>
        </div>
        
        <p className="text-sm mb-4">
          Test the email service using different providers and approaches.
          Check your inbox for test emails or review error details below.
        </p>
        
        <Tabs defaultValue="mailgun">
          <TabsList className="mb-4 grid grid-cols-3 w-full">
            <TabsTrigger value="mailgun">Mailgun (US)</TabsTrigger>
            <TabsTrigger value="loop">Loop.so</TabsTrigger>
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mailgun" className="space-y-4">
            <MailgunTestButton recipientEmail={recipientEmail} showAdvanced={showAdvanced} />
          </TabsContent>
          
          <TabsContent value="loop" className="space-y-4">
            <TestEmailButton recipientEmail={recipientEmail} />
          </TabsContent>
          
          <TabsContent value="smtp" className="space-y-4">
            <SmtpTestButton recipientEmail={recipientEmail} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
