
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import ImprovedShiftSwaps from '@/components/ImprovedShiftSwaps';
import { useAuth } from '@/hooks/useAuth';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('improved');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Force tab refresh when coming back to this page or after finding matches
  useEffect(() => {
    if (activeTab === 'matched') {
      // Only reset the matched tab for a proper refresh
      const currentTab = activeTab;
      setActiveTab('');
      setTimeout(() => setActiveTab(currentTab), 10);
    }
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

      <Tabs 
        defaultValue="improved" 
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          // When switching to matched tab, trigger a refresh
          if (value === 'matched') {
            setRefreshTrigger(prev => prev + 1);
          }
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="improved">Improved System</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
          <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
        </TabsList>
        
        {/* Use React.lazy/suspense pattern to lazily load tab content only when active */}
        {activeTab === 'improved' && (
          <TabsContent value="improved">
            <ImprovedShiftSwaps />
          </TabsContent>
        )}
        
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
    </AppLayout>
  );
};

export default ShiftSwaps;
