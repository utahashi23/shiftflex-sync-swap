
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { testMailgunEmailFunctionality } from "@/utils/emailService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MailgunTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  const handleTestClick = () => {
    setIsDialogOpen(true);
  };
  
  const handleSendTest = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing Mailgun email service...");
      console.log(`Testing Mailgun email to: ${testEmail || "default test email"}`);
      
      const result = await testMailgunEmailFunctionality(testEmail);
      
      if (!result.success) {
        toast.error(`Error testing Mailgun: ${result.error || "Unknown error"}`);
        console.error("Mailgun test error:", result.error);
        return;
      }
      
      toast.success("Mailgun test email sent successfully! Check the recipient inbox.");
      console.log("Mailgun test success:", result.result);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error in Mailgun test:", error);
      toast.error(`Error testing Mailgun: ${error.message || "Unknown error"}`);
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
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
