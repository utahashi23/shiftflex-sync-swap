
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { ShiftLengthSettings } from '@/components/system-settings/ShiftLengthSettings';
import { RegionSettings } from '@/components/system-settings/RegionSettings';
import { AreaSettings } from '@/components/system-settings/AreaSettings';
import { TruckNameSettings } from '@/components/system-settings/TruckNameSettings';
import { SimpleColleagueTypeSettings } from '@/components/system-settings/SimpleColleagueTypeSettings';
import { SwapPreferences } from '@/components/settings/SwapPreferences';
import { LeaveBlockSettings } from '@/components/system-settings/LeaveBlockSettings';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const SystemSettings = () => {
  useAuthRedirect({ protectedRoute: true });
  const { toast } = useToast();
  const { user, isLoading, isAdmin } = useAuth();
  
  // Check if user is the specific admin that we want to allow access to
  const isSpecificAdmin = user?.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c';
  const hasSystemAccess = isAdmin || isSpecificAdmin;

  useEffect(() => {
    console.log("SystemSettings - Auth state:", { 
      isLoading, 
      user: user?.email, 
      isAdmin, 
      hasSystemAccess 
    });

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
  }, [user, isLoading, hasSystemAccess, toast, isAdmin]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading authentication...</span>
        </div>
      </AppLayout>
    );
  }

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

      <Tabs defaultValue="colleague-types" className="space-y-6">
        <TabsList className="overflow-x-auto flex flex-nowrap max-w-full">
          <TabsTrigger value="shift-lengths">Shift Lengths</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="areas">Areas</TabsTrigger>
          <TabsTrigger value="truck-names">Truck Names</TabsTrigger>
          <TabsTrigger value="colleague-types">Colleague Types</TabsTrigger>
          <TabsTrigger value="swap-preferences">Swap Preferences</TabsTrigger>
          <TabsTrigger value="leave-blocks">Leave Blocks</TabsTrigger>
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
        
        <TabsContent value="regions">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Regions</h3>
              <p className="text-sm text-muted-foreground">
                Manage geographical regions for organizing truck assignments
              </p>
            </div>
            <Separator />
            <RegionSettings />
          </div>
        </TabsContent>
        
        <TabsContent value="areas">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Areas</h3>
              <p className="text-sm text-muted-foreground">
                Manage areas within regions for more specific truck assignments
              </p>
            </div>
            <Separator />
            <AreaSettings />
          </div>
        </TabsContent>

        <TabsContent value="truck-names">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Truck Names</h3>
              <p className="text-sm text-muted-foreground">
                Manage the available truck names and their assigned areas
              </p>
            </div>
            <Separator />
            <TruckNameSettings />
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
            <SimpleColleagueTypeSettings />
          </div>
        </TabsContent>
        
        <TabsContent value="swap-preferences">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">System Swap Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Configure default swap preferences for the system
              </p>
            </div>
            <Separator />
            <SwapPreferences />
          </div>
        </TabsContent>

        <TabsContent value="leave-blocks">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Leave Block Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage annual leave blocks for staff allocation
              </p>
            </div>
            <Separator />
            <LeaveBlockSettings />
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default SystemSettings;
