
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/AppLayout';
import ProfileSettings from '@/components/settings/ProfileSettings';
import PasswordSettings from '@/components/settings/PasswordSettings';
import EmailPreferences from '@/components/settings/EmailPreferences';
import EmailIntegration from '@/components/settings/EmailIntegration';
import CalendarIntegration from '@/components/settings/CalendarIntegration';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';
import { Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force a refresh by logging out and in again programmatically
      await signOut();
      toast({
        title: "Session refreshed",
        description: "Please log in again to apply admin privileges.",
      });
      // Redirect will happen automatically
    } catch (error) {
      console.error('Error refreshing session:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh your session.",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences and integrations.</p>
      </div>
      
      {/* Admin status indicator */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Admin privileges are active</h3>
                <p className="text-sm text-blue-600">You have access to admin features</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-medium text-amber-800">Admin privileges not detected</h3>
                <p className="text-sm text-amber-600">
                  {user?.email === 'admin@shiftflex.com' || user?.email === 'sfadmin' ? 
                    "You should have admin access. Try refreshing your session." : 
                    "This account does not have admin privileges."}
                </p>
              </div>
              {(user?.email === 'admin@shiftflex.com' || user?.email === 'sfadmin') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  className="ml-auto"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Session"}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-5 md:grid-cols-5 h-auto">
          <TabsTrigger value="profile" className="py-2">Profile</TabsTrigger>
          <TabsTrigger value="password" className="py-2">Password</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2">Notifications</TabsTrigger>
          <TabsTrigger value="email" className="py-2">Email</TabsTrigger>
          <TabsTrigger value="calendar" className="py-2">Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        
        <TabsContent value="password">
          <PasswordSettings />
        </TabsContent>
        
        <TabsContent value="notifications">
          <EmailPreferences />
        </TabsContent>
        
        <TabsContent value="email">
          <EmailIntegration />
        </TabsContent>
        
        <TabsContent value="calendar">
          <CalendarIntegration />
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}

export default Settings;
