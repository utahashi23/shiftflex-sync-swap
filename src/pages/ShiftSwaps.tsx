
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import AllSwapsTable from '@/components/testing/AllSwapsTable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bug, RefreshCw } from 'lucide-react';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Force tab refresh when coming back to this page or after finding matches
  useEffect(() => {
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 10);
  }, [refreshTrigger]);

  // Global refresh handler for all tabs
  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    try {
      // Increment refresh trigger to force all components to reload
      setRefreshTrigger(Date.now());
      toast({
        title: "Data refreshed",
        description: "All swap data has been refreshed"
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "There was a problem refreshing the data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
            <p className="text-gray-500 mt-1">
              Request and manage your shift swaps
              {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGlobalRefresh}
              disabled={refreshing}
              className="flex items-center"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
            
            {/* Add debug tools toggle button */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="flex items-center text-xs"
              >
                <Bug className="h-3.5 w-3.5 mr-1" />
                Debug Tools
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Show debug panel explicitly if enabled */}
      {showDebugPanel && (
        <div className="mb-6">
          <div className="p-4 border border-amber-300 rounded-lg bg-amber-50">
            <h2 className="text-lg font-bold text-amber-700">Debug Tools</h2>
            <p className="text-sm text-amber-600 mb-4">
              This panel shows comprehensive swap request and matching data for debugging.
            </p>
            
            {/* Add the AllSwapsTable component for testing */}
            <div className="mt-4 border border-gray-200 rounded-lg bg-white p-4">
              <AllSwapsTable />
            </div>
          </div>
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
