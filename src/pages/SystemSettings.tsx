
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { ShiftLengthSettings } from '@/components/system-settings/ShiftLengthSettings';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const SystemSettings = () => {
  useAuthRedirect({ protectedRoute: true });
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();
  
  // Check if user is the specific admin that we want to allow access to
  const isSpecificAdmin = user?.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c';
  const hasSystemAccess = isAdmin || isSpecificAdmin;

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access system settings.",
        variant: "destructive",
      });
    }

    if (!isLoading && user && !hasSystemAccess) {
      toast({
        title: "Access Denied",
        description: "You need administrator rights to access system settings.",
        variant: "destructive",
      });
    }
  }, [user, isLoading, hasSystemAccess, toast]);

  if (!hasSystemAccess) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">
              You need administrator rights to access system settings.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-gray-500 mt-1">
          Configure system-wide settings and options
        </p>
      </div>

      <Tabs defaultValue="shift-lengths" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shift-lengths">Shift Lengths</TabsTrigger>
          <TabsTrigger value="colleague-types">Colleague Types</TabsTrigger>
          <TabsTrigger value="truck-names">Truck Names</TabsTrigger>
        </TabsList>

        <TabsContent value="shift-lengths">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Shift Lengths</h3>
              <p className="text-sm text-muted-foreground">
                Manage the available shift length options for the calendar
              </p>
            </div>
            <Separator />
            <ShiftLengthSettings />
          </div>
        </TabsContent>

        <TabsContent value="colleague-types">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Colleague Types</h3>
              <p className="text-sm text-muted-foreground">
                Manage the available colleague type options
              </p>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              Coming soon: Colleague type management
            </div>
          </div>
        </TabsContent>

        <TabsContent value="truck-names">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Truck Names</h3>
              <p className="text-sm text-muted-foreground">
                Manage the available truck names
              </p>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              Coming soon: Truck name management
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default SystemSettings;
