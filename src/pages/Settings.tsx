
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { CalendarIntegration } from '@/components/settings/CalendarIntegration';
import { ManualNotificationTrigger } from '@/components/settings/ManualNotificationTrigger';
import { SwapPreferences } from '@/components/settings/SwapPreferences';
import { LeaveBlockSettings } from '@/components/settings/LeaveBlockSettings';
import SystemPreferences from '@/components/settings/SystemPreferences';
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';

interface SettingsSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const SettingsSection = ({ title, defaultOpen = false, children }: SettingsSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg overflow-hidden mb-6"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between bg-muted/40 px-6 py-4 cursor-pointer hover:bg-muted/60 transition-colors">
          <h2 className="text-xl font-medium">{title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-6 py-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();
  const [pageReady, setPageReady] = useState(false);
  
  // Check if user is the specific admin (this user is allowed to access system settings)
  const isSpecificAdmin = user?.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c';
  
  useEffect(() => {
    if (isLoading) {
      return; // Still loading, don't do anything yet
    }
    
    // We're not loading anymore, so the page is ready
    setPageReady(true);
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access your settings.",
        variant: "destructive",
      });
    }
    
    // Debug logging for admin identification
    if (user) {
      console.log('Settings page - User auth state:', { 
        userId: user.id, 
        userEmail: user.email,
        isAdmin,
        isSpecificAdmin: user.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c'
      });
    }
  }, [user, isLoading, toast]);
  
  if (!pageReady) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your account preferences
            {isAdmin && <span className="ml-2 text-blue-500">(Admin View)</span>}
          </p>
        </div>
        
        {/* Show System Settings button for both admins and the specific user */}
        {(isAdmin || isSpecificAdmin) && (
          <Link to="/system-settings">
            <Button variant="outline" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              System Settings
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-6">
        <SettingsSection title="Profile" defaultOpen={true}>
          <ProfileSettings />
        </SettingsSection>
        
        <SettingsSection title="Password">
          <PasswordSettings />
        </SettingsSection>

        <SettingsSection title="System Preferences">
          <SystemPreferences />
        </SettingsSection>
        
        <SettingsSection title="Swap Preferences">
          <SwapPreferences />
        </SettingsSection>
        
        <SettingsSection title="Calendar Integration">
          <CalendarIntegration />
        </SettingsSection>
        
        <SettingsSection title="Notifications">
          <ManualNotificationTrigger />
        </SettingsSection>

        {/* Make Leave Blocks section visible to all users */}
        <SettingsSection title="Leave Blocks">
          <LeaveBlockSettings />
        </SettingsSection>
      </div>
    </AppLayout>
  );
};

export default Settings;
