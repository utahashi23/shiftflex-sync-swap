
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSwapMatching } from '@/hooks/useSwapMatching';
import { RefreshCw } from 'lucide-react';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState('calendar');
  const { findSwapMatches, isProcessing } = useSwapMatching();
  
  // Force tab refresh when coming back to this page
  useEffect(() => {
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 10);
  }, []);
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
        </p>
      </div>

      <TooltipProvider>
        <Tabs 
          defaultValue="calendar" 
          value={activeTab}
          onValueChange={(value) => {
            // Force a refresh of the components when switching tabs
            // by setting active tab to an empty string first
            setActiveTab('');
            setTimeout(() => setActiveTab(value), 10);
          }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-8">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="requested">Requested Swaps</TabsTrigger>
              <TabsTrigger value="matched">Matched Swaps</TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={findSwapMatches}
              disabled={isProcessing}
              className="ml-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Finding Matches...' : 'Find Matches'}
            </Button>
          </div>
          
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
      </TooltipProvider>
    </AppLayout>
  );
};

export default ShiftSwaps;
