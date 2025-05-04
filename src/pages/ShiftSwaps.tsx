
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Handle manual refresh without forced tab switching
  const handleRefreshRequest = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>

      <TooltipProvider>
        <Tabs 
          defaultValue="calendar" 
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
            <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="min-h-[300px]">
            <ShiftSwapCalendar key={`calendar-${refreshTrigger}`} />
          </TabsContent>
          <TabsContent value="requested" className="min-h-[300px]">
            <RequestedSwaps key={`requested-${refreshTrigger}`} />
          </TabsContent>
          <TabsContent value="matched" className="min-h-[300px]">
            <MatchedSwaps key={`matched-${refreshTrigger}`} setRefreshTrigger={setRefreshTrigger} />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AppLayout>
  );
};

export default ShiftSwaps;
