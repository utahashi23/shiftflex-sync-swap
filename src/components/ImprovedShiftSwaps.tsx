
import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import { ImprovedSwapForm } from "@/components/swaps/ImprovedSwapForm";
import { createSwapRequestApi } from '@/hooks/swap-requests';
import { useImprovedSwapMatches } from '@/hooks/swap-matches/useImprovedSwapMatches';

const ImprovedShiftSwaps = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRequest, setCreatingRequest] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const { swaps, fetchUserSwaps } = useImprovedSwapMatches();
  
  // New state for filters
  const [filters, setFilters] = useState({
    dateRange: { from: null, to: null },
    truckName: '',
    shiftType: '',
    sortDirection: 'asc' as 'asc' | 'desc'
  });

  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', new Date().toISOString().split('T')[0]);
          
        if (error) throw error;
        
        setShifts(data || []);
      } catch (err) {
        console.error('Error fetching shifts:', err);
        toast({
          title: "Failed to load shifts",
          description: "There was a problem loading your shifts",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShifts();
  }, [user]);
  
  const openDialog = () => {
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleMonthChange = (date: Date | undefined) => {
    if (date) {
      setSelectedMonth(date);
    }
  };
  
  const createSwapRequest = async (
    shiftIds: string[], 
    wantedDates: string[], 
    acceptedTypes: string[],
    requiredSkillsets?: string[]
  ) => {
    setCreatingRequest(true);
    
    try {
      // Format preferred dates
      const preferredDates = wantedDates.map(date => ({
        date,
        acceptedTypes
      }));
      
      // Call the API to create the swap request
      const result = await createSwapRequestApi(shiftIds, preferredDates, requiredSkillsets);
      
      // Refresh the swaps after creating
      fetchUserSwaps();
      
      setCreatingRequest(false);
      return true;
    } catch (error) {
      console.error('Error creating swap request:', error);
      setCreatingRequest(false);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Shift Swaps</CardTitle>
          <CardDescription>Request and view your shift swaps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create New Request</h3>
            <Button onClick={openDialog} disabled={isLoading}>
              Create Request
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Calendar View</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{format(selectedMonth, 'MMMM yyyy')}</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No upcoming shifts found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {shifts.map(shift => (
                <div key={shift.id} className="border rounded-lg p-3">
                  <p className="font-medium">{format(new Date(shift.date), 'EEEE, MMM d, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">
                    {shift.start_time} - {shift.end_time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <ImprovedSwapForm
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onSubmit={createSwapRequest}
        currentMonth={selectedMonth}
        filters={filters}
      />
    </div>
  );
};

export default ImprovedShiftSwaps;
