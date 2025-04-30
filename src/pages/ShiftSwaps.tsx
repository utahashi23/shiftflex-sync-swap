
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/layouts/AppLayout';
import ShiftSwapCalendar from '@/components/calendar/ShiftSwapCalendar';
import RequestedSwaps from '@/components/RequestedSwaps';
import MatchedSwaps from '@/components/MatchedSwaps';
import LoadingState from '@/components/LoadingState';
import { toast } from '@/hooks/use-toast';

const ShiftSwaps = () => {
  const { isLoading, user, signOut } = useAuth();
  const { isAuthenticated } = useAuthRedirect({ protectedRoute: true });
  const [activeTab, setActiveTab] = useState('calendar');
  const [pageLoaded, setPageLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Add enhanced logging and safety timeout
  useEffect(() => {
    console.log("ShiftSwaps page mounted", { 
      isLoading, 
      isAuthenticated: !!user,
      userId: user?.id,
      email: user?.email
    });
    
    // Primary timeout to transition from loading state
    const pageTimeout = setTimeout(() => {
      setPageLoaded(true);
      console.log("ShiftSwaps normal timeout triggered - showing content");
    }, 3000);
    
    // Safety timeout - if we're still loading after 8 seconds, show force logout option
    const safetyTimeout = setTimeout(() => {
      setLoadingTimeout(true);
      console.log("ShiftSwaps extended timeout triggered - showing force logout option");
      toast({
        title: "Loading taking longer than expected",
        description: "You can force logout to reset your session.",
        variant: "destructive",
      });
    }, 8000);
    
    // If not loading anymore, clear timeouts
    if (!isLoading && user) {
      clearTimeout(safetyTimeout);
      setPageLoaded(true);
      console.log("ShiftSwaps loading complete - user authenticated");
    }
    
    return () => {
      clearTimeout(pageTimeout);
      clearTimeout(safetyTimeout);
    };
  }, [isLoading, user]);
  
  const handleForceLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error("Force logout failed:", error);
      window.location.href = '/login';
    }
  };
  
  if (isLoading && !pageLoaded) {
    return <LoadingState 
      fullScreen 
      message="Loading shift management..." 
      debugInfo={`Auth state: ${isLoading ? 'loading' : 'loaded'}, User: ${user ? 'present' : 'missing'}`}
      showForceLogout={loadingTimeout}
    />;
  }

  // Don't render the content until we're authorized
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <LoadingState 
          message="Authentication required" 
          debugInfo="Please login to access this page"
          showForceLogout={true}
        />
        <Button 
          variant="destructive" 
          className="mt-4" 
          onClick={handleForceLogout}
        >
          Force Logout & Return to Login
        </Button>
      </div>
    );
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
