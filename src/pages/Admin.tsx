
import React, { useState } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import RegionManagement from '@/components/admin/RegionManagement';
import AreaManagement from '@/components/admin/AreaManagement';
import TruckManagement from '@/components/admin/TruckManagement';
import ShiftLengthManagement from '@/components/admin/ShiftLengthManagement';
import ColleagueTypeManagement from '@/components/admin/ColleagueTypeManagement';
import { useAuth } from '@/hooks/useAuth';

const Admin = () => {
  useAuthRedirect({ protectedRoute: true });
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('regions');

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto py-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="mt-2 text-gray-500">
                  You do not have admin privileges to access this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage system configuration and settings
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="regions">Regions</TabsTrigger>
                <TabsTrigger value="areas">Areas</TabsTrigger>
                <TabsTrigger value="trucks">Trucks</TabsTrigger>
                <TabsTrigger value="shift-lengths">Shift Lengths</TabsTrigger>
                <TabsTrigger value="colleague-types">Colleague Types</TabsTrigger>
              </TabsList>
              <TabsContent value="regions" className="py-4">
                <RegionManagement />
              </TabsContent>
              <TabsContent value="areas" className="py-4">
                <AreaManagement />
              </TabsContent>
              <TabsContent value="trucks" className="py-4">
                <TruckManagement />
              </TabsContent>
              <TabsContent value="shift-lengths" className="py-4">
                <ShiftLengthManagement />
              </TabsContent>
              <TabsContent value="colleague-types" className="py-4">
                <ColleagueTypeManagement />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Admin;
