import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Calendar, Sun, Sunrise, Moon, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/hooks/auth/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarShift } from '@/types/calendarTypes';

interface ShiftSwapRequestFormProps {
  shift: CalendarShift;
  onCancel: () => void;
  onComplete: () => void;
  className?: string;
}

const ShiftSwapRequestForm = ({
  shift,
  onCancel,
  onComplete,
  className
}: ShiftSwapRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSwapDates, setSelectedSwapDates] = useState<string[]>([]);
  const [acceptableShiftTypes, setAcceptableShiftTypes] = useState({
    day: shift.type === 'day',
    afternoon: shift.type === 'afternoon',
    night: shift.type === 'night',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock available dates (in a real app this would come from the database)
  const availableDates = [
    '2025-05-15',
    '2025-05-20', 
    '2025-05-22',
    '2025-05-24',
    '2025-05-26',
    '2025-05-29',
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to request shift swaps.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSwapDates.length === 0) {
      toast({
        title: "No Dates Selected",
        description: "Please select at least one date you're willing to swap for.",
        variant: "destructive",
      });
      return;
    }

    if (!acceptableShiftTypes.day && !acceptableShiftTypes.afternoon && !acceptableShiftTypes.night) {
      toast({
        title: "No Shift Types Selected",
        description: "Please select at least one acceptable shift type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In a real app, we would send this to Supabase
      // const { data, error } = await supabase
      //   .from('shift_swap_requests')
      //   .insert({
      //     requester_id: user.id,
      //     requester_shift_id: shift.id,
      //     status: 'pending',
      //     acceptable_dates: selectedSwapDates,
      //     acceptable_types: Object.entries(acceptableShiftTypes)
      //       .filter(([_, value]) => value)
      //       .map(([key]) => key),
      //   });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Swap Request Created",
        description: `Your swap request for ${new Date(shift.date).toLocaleDateString()} has been submitted.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      
      onComplete();
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "There was a problem creating your swap request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDateSelection = (dateStr: string) => {
    setSelectedSwapDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Request Shift Swap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/30 rounded-md p-4">
          <p className="text-sm font-medium mb-2">Your shift to swap:</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(shift.date).toLocaleDateString()}</div>
              <div className="text-sm text-muted-foreground">{shift.startTime} - {shift.endTime}</div>
            </div>
            <div className={cn(
              "p-2 rounded-full",
              shift.type === 'day' ? "bg-yellow-100" : 
              shift.type === 'afternoon' ? "bg-orange-100" : 
              "bg-blue-100"
            )}>
              {shift.type === 'day' ? (
                <Sunrise className="h-5 w-5 text-yellow-800" />
              ) : shift.type === 'afternoon' ? (
                <Sun className="h-5 w-5 text-orange-800" />
              ) : (
                <Moon className="h-5 w-5 text-blue-800" />
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Select acceptable shift types:</label>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="day-shift" 
                checked={acceptableShiftTypes.day}
                onCheckedChange={(checked) => 
                  setAcceptableShiftTypes(prev => ({ ...prev, day: checked === true }))
                }
              />
              <label 
                htmlFor="day-shift" 
                className="text-sm flex items-center cursor-pointer"
              >
                <Sunrise className="h-4 w-4 mr-1 text-yellow-600" />
                Day Shift (07:00 - 15:00)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="afternoon-shift" 
                checked={acceptableShiftTypes.afternoon}
                onCheckedChange={(checked) => 
                  setAcceptableShiftTypes(prev => ({ ...prev, afternoon: checked === true }))
                }
              />
              <label 
                htmlFor="afternoon-shift" 
                className="text-sm flex items-center cursor-pointer"
              >
                <Sun className="h-4 w-4 mr-1 text-orange-600" />
                Afternoon Shift (15:00 - 23:00)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="night-shift" 
                checked={acceptableShiftTypes.night}
                onCheckedChange={(checked) => 
                  setAcceptableShiftTypes(prev => ({ ...prev, night: checked === true }))
                }
              />
              <label 
                htmlFor="night-shift" 
                className="text-sm flex items-center cursor-pointer"
              >
                <Moon className="h-4 w-4 mr-1 text-blue-600" />
                Night Shift (23:00 - 07:00)
              </label>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Select dates you'd accept in exchange:
          </label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {availableDates.map(date => (
              <div 
                key={date}
                className={cn(
                  "p-3 rounded-md border cursor-pointer hover:border-primary hover:bg-primary/5 transition-all",
                  selectedSwapDates.includes(date) ? "border-primary bg-primary/10" : "border-gray-200"
                )}
                onClick={() => toggleDateSelection(date)}
              >
                <div className="text-sm font-medium">{formatDate(date)}</div>
              </div>
            ))}
          </div>
          
          {selectedSwapDates.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              Please select at least one date.
            </p>
          )}
        </div>
        
        <div className="pt-4 mt-4 border-t flex flex-col space-y-2">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedSwapDates.length === 0 || 
              (!acceptableShiftTypes.day && !acceptableShiftTypes.afternoon && !acceptableShiftTypes.night)}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                Submitting...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" /> 
                Submit Swap Request
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftSwapRequestForm;
