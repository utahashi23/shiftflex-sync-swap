
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { testMailgunEmailFunctionality } from "@/utils/emailService";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const handleTestClick = () => {
    setIsDialogOpen(true);
    setErrorDetails(null);
  };
  
  const handleSendTest = async () => {
    try {
      setIsLoading(true);
      setErrorDetails(null);
      toast.info("Testing Mailgun email service...");
      console.log(`Testing Mailgun email to: ${testEmail || "default test email"}`);
      
      const result = await testMailgunEmailFunctionality(testEmail);
      
      if (!result.success) {
        const errorMsg = result.error || "Unknown error";
        setErrorDetails(errorMsg);
        toast.error(`Error testing Mailgun: ${errorMsg}`);
        console.error("Mailgun test error:", errorMsg);
        return;
      }
      
      toast.success("Mailgun test email sent successfully! Check the recipient inbox.");
      console.log("Mailgun test success:", result.result);
      setIsDialogOpen(false);
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error";
      setErrorDetails(errorMsg);
      console.error("Error in Mailgun test:", error);
      toast.error(`Error testing Mailgun: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Button 
        onClick={handleTestClick} 
        variant="outline"
        className="w-full mt-4"
      >
        Test Mailgun Integration
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Test Mailgun Email</DialogTitle>
            <DialogDescription>
              Enter an email address to receive a test email from the Mailgun integration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              id="email"
              placeholder="Email address"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to send to the default test email.
            </p>
          </div>
          
          {errorDetails && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorDetails}
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSendTest} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Test Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
