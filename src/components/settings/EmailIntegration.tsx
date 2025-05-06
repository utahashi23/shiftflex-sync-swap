
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MailgunTestButton } from "@/components/MailgunTestButton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const EmailIntegration = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState<"unknown" | "verified" | "failed">("unknown");
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Email Integration</h3>
        <p className="text-sm text-muted-foreground">
          Configure email notifications and test Mailgun integration
        </p>
      </div>
      <Separator />
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <label htmlFor="email-notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email Notifications
                </label>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for shift swap matches and approvals
            </p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-sm font-medium">
                Mailgun Integration Status
              </h4>
              {integrationStatus === "verified" ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : integrationStatus === "failed" ? (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              ) : (
                <Badge variant="outline">
                  Unknown
                </Badge>
              )}
            </div>
            
            {integrationStatus === "failed" && (
              <Alert variant="destructive" className="mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Email integration test failed. Please check your Mailgun configuration and domain verification.
                </AlertDescription>
              </Alert>
            )}
            
            <MailgunTestButton />
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-secondary/30 rounded-lg">
        <h4 className="font-medium mb-2">About Mailgun Integration</h4>
        <p className="text-sm text-muted-foreground mb-2">
          ShiftFlex uses Mailgun to send transactional emails for shift swap notifications and updates.
          Make sure your Mailgun domain is properly verified for reliable delivery.
        </p>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Mailgun Domain:</span> shiftflex.au
        </div>
      </div>
    </div>
  );
};
