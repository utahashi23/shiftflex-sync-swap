
import { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { CalendarIntegration } from '@/components/settings/CalendarIntegration';
import { EmailIntegration } from '@/components/settings/EmailIntegration'; 
import { EmailPreferences } from '@/components/settings/EmailPreferences';

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and integrations.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="email-prefs">Notifications</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>
            <TabsContent value="email">
              <EmailIntegration />
            </TabsContent>
            <TabsContent value="email-prefs">
              <EmailPreferences />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarIntegration />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
