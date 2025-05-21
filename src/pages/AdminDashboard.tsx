
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemStats } from '@/components/admin/SystemStats';
import { SystemLogs } from '@/components/admin/SystemLogs';
import { RecordLookup } from '@/components/admin/RecordLookup';
import { Database, Users, Activity, Search } from 'lucide-react';

const AdminDashboard = () => {
  useAuthRedirect({ protectedRoute: true, adminRoute: true });
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to view this page',
        variant: 'destructive',
      });
    }
  }, [isAdmin, toast]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">
              You need administrator rights to access this dashboard.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Advanced administration tools and system overview
        </p>
      </div>

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Statistics
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="lookup" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Record Lookup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <SystemStats />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <SystemLogs />
        </TabsContent>

        <TabsContent value="lookup" className="space-y-6">
          <RecordLookup />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default AdminDashboard;
