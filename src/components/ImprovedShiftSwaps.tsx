
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImprovedSwapForm } from '@/components/swaps/ImprovedSwapForm';
import { useSwapRequests } from '@/hooks/useSwapRequests';
import { useAuth } from '@/hooks/useAuth';
import { useSwapCalendarState } from '@/hooks/useSwapCalendarState';
import { CalendarHeader, WeekdayHeader } from '@/components/calendar/CalendarHeader';
import SwapCalendar from '@/components/SwapCalendar';

const ImprovedShiftSwaps = () => {
  const [isCreateSwapDialogOpen, setIsCreateSwapDialogOpen] = useState(false);
  const { user } = useAuth();
  const {
    currentDate,
    changeMonth,
  } = useSwapCalendarState();
  
  const {
    createSwapRequest,
    isLoading: isCreatingSwapRequest, // Renamed to use the isLoading property from useSwapRequests
  } = useSwapRequests();
  
  const handleSwapSubmit = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[]) => {
    if (!user) return false;
    
    try {
      await createSwapRequest(shiftIds, wantedDates, acceptedTypes);
      
      return true;
    } catch (err) {
      console.error('Error creating swap request:', err);
      return false;
    }
  };
  
  // Open the dialog when "Create Swap" button is clicked
  const handleCreateSwapClick = () => {
    setIsCreateSwapDialogOpen(true);
  };
  
  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="create">Create Swap</TabsTrigger>
        <TabsTrigger value="my-swaps">My Swaps</TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Create Shift Swap</CardTitle>
            <CardDescription>
              Select shifts you want to swap and set your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add month changer here */}
            <CalendarHeader 
              currentDate={currentDate} 
              onChangeMonth={changeMonth} 
            />
            <WeekdayHeader />
            <ImprovedSwapForm 
              isOpen={true} 
              onClose={() => {}} 
              onSubmit={handleSwapSubmit}
              isDialog={false}
              currentDate={currentDate}
            />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="my-swaps" className="space-y-6">
        <SwapCalendar />
      </TabsContent>
    </Tabs>
  );
};

export default ImprovedShiftSwaps;
