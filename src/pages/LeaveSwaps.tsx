
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import MyLeave from '@/components/leave-swaps/MyLeave';
import RequestSwap from '@/components/leave-swaps/RequestSwap';
import MatchedLeaveSwaps from '@/components/leave-swaps/MatchedLeaveSwaps';

const LeaveSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('my-leave');
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
        <h1 className="text-3xl font-bold tracking-tight">Leave Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your leave block swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>

      <Tabs 
        defaultValue="my-leave" 
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="my-leave">My Leave</TabsTrigger>
          <TabsTrigger value="request-swap">Request Swap</TabsTrigger>
          <TabsTrigger value="matched-swaps">Matched Swaps</TabsTrigger>
        </TabsList>
        
        {activeTab === 'my-leave' && (
          <TabsContent value="my-leave">
            <MyLeave key={`my-leave-${refreshTrigger}`} />
          </TabsContent>
        )}
        
        {activeTab === 'request-swap' && (
          <TabsContent value="request-swap">
            <RequestSwap key={`request-swap-${refreshTrigger}`} />
          </TabsContent>
        )}
        
        {activeTab === 'matched-swaps' && (
          <TabsContent value="matched-swaps">
            <MatchedLeaveSwaps key={`matched-swaps-${refreshTrigger}`} setRefreshTrigger={setRefreshTrigger} />
          </TabsContent>
        )}
      </Tabs>
    </AppLayout>
  );
};

export default LeaveSwaps;
