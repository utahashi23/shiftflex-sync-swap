
import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const EmailDomainWarning = () => {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    if (!user?.email) return;
    
    const isAmbulanceVicEmail = user.email.toLowerCase().endsWith('@ambulance.vic.gov.au');
    const warningKey = `ambulance_warning_shown_${user.id}`;
    const warningShown = localStorage.getItem(warningKey);
    
    if (isAmbulanceVicEmail && !warningShown) {
      setShowWarning(true);
      // Mark as shown for this user
      localStorage.setItem(warningKey, 'true');
    }
  }, [user]);
  
  if (!showWarning) return null;
  
  return (
    <Alert variant="warning" className="mb-6 bg-amber-50 border-amber-300">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="ml-3 flex-1">
          <AlertTitle className="text-amber-800 font-medium">Important Email Notification</AlertTitle>
          <AlertDescription className="text-amber-700">
            We've detected you're using an <strong>@ambulance.vic.gov.au</strong> email address. 
            Ambulance Victoria blocks ShiftFlex emails. To receive notifications about Shift Swap and Leave Matches, 
            please update your email in <Link to="/settings" className="font-medium underline">Settings</Link>.
          </AlertDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0 rounded-full text-amber-700 hover:bg-amber-200 hover:text-amber-900"
          onClick={() => setShowWarning(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
};
