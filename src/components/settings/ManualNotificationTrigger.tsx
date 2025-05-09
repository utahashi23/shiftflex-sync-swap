
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Clock, AlertTriangle, Mail } from 'lucide-react';
import { triggerHourlyMatchNotification, testEmailConfiguration } from '@/utils/triggerHourlyCheck';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function ManualNotificationTrigger() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Log admin status for debugging
  useEffect(() => {
    console.log('ManualNotificationTrigger: isAdmin status =', isAdmin);
    console.log('ManualNotificationTrigger: user =', user?.id, user?.email);
    console.log('ManualNotificationTrigger: user app_metadata =', user?.app_metadata);
  }, [isAdmin, user]);

  // Early return if not admin
  if (!isAdmin) {
    console.log('ManualNotificationTrigger: Not showing component because isAdmin is false');
    return null;
  }

  const handleTriggerCheck = async () => {
    setIsTriggering(true);
    try {
      await triggerHourlyMatchNotification({
        recipient_email: testEmail || undefined,
        is_test: true
      });
      toast({
        title: 'Success',
        description: 'Notification check triggered successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error triggering check:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger notification check.',
        variant: 'destructive',
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
    } finally {
      setIsTesting(false);
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
      </CardContent>
    </Card>
  );
}
