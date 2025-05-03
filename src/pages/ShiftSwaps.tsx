
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminDataDebugger from "@/components/AdminDataDebugger";

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDebugger, setShowDebugger] = useState(false);
  
  // Force tab refresh when coming back to this page or after finding matches
  useEffect(() => {
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 10);
  }, [refreshTrigger]);

  // Show debugger by default only for admins
  useEffect(() => {
    if (isAdmin) {
      setShowDebugger(true);
    }
  }, [isAdmin]);
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>

      {isAdmin && showDebugger && (
        <div className="mb-8">
          <AdminDataDebugger />
        </div>
      )}

      <TooltipProvider>
        <Tabs 
          defaultValue="calendar" 
          value={activeTab}
          onValueChange={(value) => {
            // Force a refresh of the components when switching tabs
            setActiveTab('');
            setTimeout(() => setActiveTab(value), 10);
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
            <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar">
            <ShiftSwapCalendar key={`calendar-${refreshTrigger}`} />
          </TabsContent>
          <TabsContent value="requested">
            <RequestedSwaps key={`requested-${refreshTrigger}`} />
          </TabsContent>
          <TabsContent value="matched">
            <MatchedSwaps key={`matched-${refreshTrigger}`} setRefreshTrigger={setRefreshTrigger} />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AppLayout>
  );
};

export default ShiftSwaps;
