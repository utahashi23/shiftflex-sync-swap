
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { CalendarIntegration } from '@/components/settings/CalendarIntegration';

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-8">
        <ProfileSettings />
        <PasswordSettings />
        <CalendarIntegration />
      </div>
    </AppLayout>
  );
};

export default Settings;
