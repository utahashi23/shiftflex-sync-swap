
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { EmailTestPanel } from '@/components/EmailTestPanel';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Force tab refresh when coming back to this page or after finding matches
  useEffect(() => {
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 10);
  }, [refreshTrigger]);
  
  // Handle manual refresh
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
            // Simply set the tab without the reset/timeout to avoid unnecessary renders
            setActiveTab(value);
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
            <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
          </TabsList>
          
          {/* Use React.lazy/suspense pattern to lazily load tab content only when active */}
          {activeTab === 'calendar' && (
            <TabsContent value="calendar">
              <ShiftSwapCalendar key={`calendar-${refreshTrigger}`} />
            </TabsContent>
          )}
          
          {activeTab === 'requested' && (
            <TabsContent value="requested">
              <RequestedSwaps key={`requested-${refreshTrigger}`} />
            </TabsContent>
          )}
          
          {activeTab === 'matched' && (
            <TabsContent value="matched">
              <MatchedSwaps key={`matched-${refreshTrigger}`} setRefreshTrigger={setRefreshTrigger} />
            </TabsContent>
          )}
        </Tabs>
      </TooltipProvider>
      
      {/* Add EmailTestPanel component */}
      {isAdmin && (
        <div className="mt-8">
          <EmailTestPanel />
        </div>
      )}
    </AppLayout>
  );
};

export default ShiftSwaps;
