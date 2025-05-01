
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSwapMatcher } from '@/hooks/useSwapMatcher'; 
import { RefreshCw, Bug } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState('calendar');
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  
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
  
  const handleTestMode = async () => {
    setIsTestLoading(true);
    try {
      // Toggle test mode
      const newTestMode = !testMode;
      setTestMode(newTestMode);
      
      if (newTestMode) {
        // If enabling test mode, switch to the matched tab
        setActiveTab('matched');
        
        // Force refresh to show test data
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: "Test Mode Enabled",
          description: "Showing all shift swap requests in Matched Swaps tab",
        });
      } else {
        // If disabling test mode, refresh to show normal data
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: "Test Mode Disabled",
          description: "Returned to normal view",
        });
      }
    } catch (error) {
      console.error("Error toggling test mode:", error);
      toast({
        title: "Error",
        description: "Failed to toggle test mode",
        variant: "destructive"
      });
    } finally {
      setIsTestLoading(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Button 
          onClick={handleTestMode}
          disabled={isTestLoading}
          variant="outline"
          className={testMode ? "bg-amber-100 border-amber-300 text-amber-800" : ""}
        >
          <Bug className={`h-4 w-4 mr-2 ${isTestLoading ? 'animate-spin' : ''}`} />
          {testMode ? "Disable Test Mode" : "Enable Test Mode"}
        </Button>
        
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
            <MatchedSwaps key={`matched-${refreshTrigger}`} testMode={testMode} />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </AppLayout>
  );
};

export default ShiftSwaps;
