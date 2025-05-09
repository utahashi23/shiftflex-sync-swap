
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Clock, AlertTriangle, Mail, SendHorizonal } from 'lucide-react';
import { triggerHourlyMatchNotification, testEmailConfiguration, notifyAllPendingMatches } from '@/utils/triggerHourlyCheck';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export function ManualNotificationTrigger() {
  const { isAdmin, user } = useAuth();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();
  
  const isSpecificAdmin = user?.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c';
  
  // Debug log for admin status
  useEffect(() => {
    console.log('ManualNotificationTrigger - Auth state:', { 
      isAdmin, 
      userId: user?.id, 
      isSpecificAdmin,
      userEmail: user?.email
    });
  }, [isAdmin, user, isSpecificAdmin]);

  if (!isAdmin) return null;

  const handleTriggerCheck = async () => {
    setIsTriggering(true);
    try {
      await triggerHourlyMatchNotification({
        recipient_email: testEmail || undefined,
        is_test: true
      });
      
      toast({
        title: "Notification Triggered",
        description: "Match notifications have been triggered manually.",
      });
    } catch (error) {
      console.error('Error triggering notifications:', error);
      
      toast({
        title: "Error",
        description: "Failed to trigger notifications. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setIsTesting(true);
    try {
      await testEmailConfiguration(testEmail);
      
      toast({
        title: "Test Email Sent",
        description: `A test email has been sent to ${testEmail}.`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      
      toast({
        title: "Error",
        description: "Failed to send test email. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleNotifyAllPendingMatches = async () => {
    setIsNotifying(true);
    try {
      const result = await notifyAllPendingMatches();
      
      if (result.success) {
        toast({
          title: "Notification Sent",
          description: `Sent ${result.emailCount || 0} notifications to users with pending swap matches.`,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error notifying pending matches:', error);
      
      toast({
        title: "Error",
        description: "Failed to send notifications. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Notification Controls</CardTitle>
        <CardDescription>
          Admin tools to manually trigger match notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Admin Only</AlertTitle>
          <AlertDescription>
            These controls allow manual triggering of the notification system. 
            Automatic scheduling has been disabled.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Email Address (Optional)</label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email for testing"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTestEmail}
              disabled={isTesting || !testEmail}
            >
              {isTesting ? "Sending..." : "Test Email"}
              <Mail className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If provided, notifications will be sent to this email address only
          </p>
        </div>
        
        <Button 
          onClick={handleTriggerCheck} 
          disabled={isTriggering}
          className="w-full"
        >
          {isTriggering ? "Processing..." : "Trigger Match Notifications Now"}
          <Clock className="ml-2 h-4 w-4" />
        </Button>
        
        {isSpecificAdmin && (
          <>
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Special Admin Actions</h3>
              <Button 
                onClick={handleNotifyAllPendingMatches} 
                disabled={isNotifying}
                variant="secondary"
                className="w-full"
              >
                {isNotifying ? "Sending Notifications..." : "Notify All Users with Pending Matches"}
                <SendHorizonal className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Sends notifications to all users with pending swap matches
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
