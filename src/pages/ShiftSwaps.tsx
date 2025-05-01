
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSwapMatcher } from '@/hooks/swap-matching'; 
import { RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState('calendar');
  const { findSwapMatches, isProcessing } = useSwapMatcher(); // Using the primary hook
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Force tab refresh when coming back to this page or after finding matches
  useEffect(() => {
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 10);
  }, [refreshTrigger]);
  
  const handleFindMatches = async () => {
    console.log('Find Matches button clicked');
    await findSwapMatches();
    // Refresh the tabs to show updated data
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: "Refresh complete",
      description: "The swap data has been refreshed.",
    });
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
        </p>
      </div>

      <div className="flex justify-end items-center mb-4">
        <Button 
          onClick={handleFindMatches}
          disabled={isProcessing}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Finding Matches...' : 'Find Matches'}
        </Button>
      </div>

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
            <MatchedSwaps key={`matched-${refreshTrigger}`} />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AppLayout>
  );
};

export default ShiftSwaps;
