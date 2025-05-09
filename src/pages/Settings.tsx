
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { CalendarIntegration } from '@/components/settings/CalendarIntegration';
import { ManualNotificationTrigger } from '@/components/settings/ManualNotificationTrigger';
import { useToast } from "@/hooks/use-toast";
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading]);
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account preferences
          {isAdmin && <span className="ml-2 text-blue-500">(Admin View)</span>}
        </p>
      </div>

      <div className="space-y-8">
        {isAdmin && <ManualNotificationTrigger />}
        <ProfileSettings />
        <PasswordSettings />
        <CalendarIntegration />
      </div>
    </AppLayout>
  );
};

export default Settings;

