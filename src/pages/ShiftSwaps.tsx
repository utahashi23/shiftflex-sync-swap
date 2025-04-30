
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/calendar/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import LoadingState from '@/components/LoadingState';

const ShiftSwaps = () => {
  const { isLoading } = useAuth();
  const { isAuthenticated } = useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState('calendar');
  
  if (isLoading) {
    return <LoadingState fullScreen message="Loading shift management..." />;
  }

  // Don't render the content until we're authorized
  if (!isAuthenticated) {
    return null; // The redirect will happen via useAuthRedirect
  }
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
        </p>
      </div>

      <Tabs 
        defaultValue="calendar" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
          <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <ShiftSwapCalendar />
        </TabsContent>
        <TabsContent value="requested">
          <RequestedSwaps />
        </TabsContent>
        <TabsContent value="matched">
          <MatchedSwaps />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ShiftSwaps;
