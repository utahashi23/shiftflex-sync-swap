
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const EmailDomainWarning = () => {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    // Check if user exists and has an email
    if (!user?.email) return;
    
    // Check if the email has the domain @ambulance.vic.gov.au
    const hasBlockedDomain = user.email.endsWith('@ambulance.vic.gov.au');
    
    // Check if we've already shown this warning before
    const warningShown = localStorage.getItem(`email-warning-shown-${user.id}`);
    
    // If it has the blocked domain and we haven't shown the warning yet
    if (hasBlockedDomain && !warningShown) {
      setShowWarning(true);
    }
  }, [user]);
  
  const dismissWarning = () => {
    if (user?.id) {
      // Mark this warning as shown for this user
      localStorage.setItem(`email-warning-shown-${user.id}`, 'true');
    }
    setShowWarning(false);
    
    // Show toast to confirm
    toast({
      title: "Notification dismissed",
      description: "You can change your email anytime in Settings",
    });
  };
  
  if (!showWarning) return null;
  
  return (
    <Alert variant="destructive" className="mb-4 relative">
      <Info className="h-4 w-4 mr-2" />
      <AlertTitle>Important Email Notification</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          We've detected that you're using an <strong>@ambulance.vic.gov.au</strong> email address. 
          Ambulance Victoria blocks emails from ShiftFlex, which means you won't receive notifications about your shift swaps or leave matches.
        </p>
        <p className="mb-4">
          Please consider changing your email in Settings to ensure you receive all notifications.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link to="/settings">Go to Settings</Link>
          </Button>
          <Button variant="outline" onClick={dismissWarning}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-3 right-3" 
        onClick={dismissWarning}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </Alert>
  );
};
