
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CalendarIcon, Sunrise, Sun, Moon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FormValues = {
  shiftId: string;
  wantedDate: Date | undefined;
  acceptedTypes: {
    day: boolean;
    afternoon: boolean;
    night: boolean;
  };
};

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, wantedDate: string, acceptedTypes: string[]) => Promise<void>;
}

export const ImprovedSwapForm = ({ isOpen, onClose, onSubmit }: ImprovedSwapFormProps) => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      shiftId: '',
      wantedDate: undefined,
      acceptedTypes: {
        day: true,
        afternoon: true,
        night: true
      }
    }
  });

  const selectedShiftId = watch('shiftId');
  const selectedDate = watch('wantedDate');
  const acceptedTypes = watch('acceptedTypes');
  
  // Fetch user's shifts
  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'scheduled');
          
        if (error) throw error;
        
        setShifts(data || []);
      } catch (err) {
        console.error('Error fetching shifts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShifts();
  }, [user]);

  const onFormSubmit = async (data: FormValues) => {
    if (!data.shiftId || !data.wantedDate) return;
    
    const acceptedTypesArray: string[] = [];
    if (data.acceptedTypes.day) acceptedTypesArray.push('day');
    if (data.acceptedTypes.afternoon) acceptedTypesArray.push('afternoon');
    if (data.acceptedTypes.night) acceptedTypesArray.push('night');
    
    if (acceptedTypesArray.length === 0) {
      // Must select at least one shift type
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(data.shiftId, format(data.wantedDate, 'yyyy-MM-dd'), acceptedTypesArray);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedShift = shifts.find(shift => shift.id === selectedShiftId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Shift Swap Request</DialogTitle>
          <DialogDescription>
            Select the shift you want to swap and specify your preferences.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Shift Selection */}
            <div className="space-y-2">
              <Label htmlFor="shiftId">Select Your Shift</Label>
              <Select 
                onValueChange={(value) => setValue('shiftId', value)}
                value={selectedShiftId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a shift to swap" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map(shift => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {format(new Date(shift.date), 'MMM d, yyyy')} - {shift.truck_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Selected Shift Details */}
            {selectedShift && (
              <div className="p-3 border rounded-md bg-secondary/20">
                <p className="text-sm font-medium">Selected Shift</p>
                <p className="text-base">{format(new Date(selectedShift.date), 'PPPP')}</p>
                <p className="text-sm">
                  {selectedShift.start_time.substring(0, 5)} - {selectedShift.end_time.substring(0, 5)}
                </p>
                <p className="text-sm text-gray-500">{selectedShift.truck_name}</p>
              </div>
            )}
            
            {/* Wanted Date */}
            <div className="space-y-2">
              <Label>Date You Want Instead</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setValue('wantedDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Accepted Shift Types */}
            <div className="space-y-2">
              <Label>Acceptable Shift Types</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select what types of shifts you're willing to accept on your wanted date.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="day-shift"
                    checked={acceptedTypes.day}
                    onCheckedChange={(checked) => {
                      setValue('acceptedTypes.day', checked === true);
                    }}
                  />
                  <Label htmlFor="day-shift" className="flex items-center">
                    <div className="bg-yellow-100 text-yellow-800 p-1 rounded-md mr-2">
                      <Sunrise className="h-4 w-4" />
                    </div>
                    <span>Day Shift</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="afternoon-shift"
                    checked={acceptedTypes.afternoon}
                    onCheckedChange={(checked) => {
                      setValue('acceptedTypes.afternoon', checked === true);
                    }}
                  />
                  <Label htmlFor="afternoon-shift" className="flex items-center">
                    <div className="bg-orange-100 text-orange-800 p-1 rounded-md mr-2">
                      <Sun className="h-4 w-4" />
                    </div>
                    <span>Afternoon Shift</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="night-shift"
                    checked={acceptedTypes.night}
                    onCheckedChange={(checked) => {
                      setValue('acceptedTypes.night', checked === true);
                    }}
                  />
                  <Label htmlFor="night-shift" className="flex items-center">
                    <div className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
                      <Moon className="h-4 w-4" />
                    </div>
                    <span>Night Shift</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedShiftId || !selectedDate || 
                (!acceptedTypes.day && !acceptedTypes.afternoon && !acceptedTypes.night)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Swap Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
