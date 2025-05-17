
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { 
  Loader2, 
  CalendarIcon, 
  Sunrise, 
  Sun, 
  Moon,
  PlusCircle,
  X
} from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type FormValues = {
  shiftId: string;
  wantedDates: Date[];
  acceptedTypes: {
    day: boolean;
    afternoon: boolean;
    night: boolean;
  };
  regionPreferences: {
    regionId: string;
    areaId?: string;
  }[];
};

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, wantedDates: string[], acceptedTypes: string[]) => Promise<boolean>;
}

export const ImprovedSwapForm = ({ isOpen, onClose, onSubmit }: ImprovedSwapFormProps) => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { user } = useAuth();

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      shiftId: '',
      wantedDates: [],
      acceptedTypes: {
        day: true,
        afternoon: true,
        night: true
      },
      regionPreferences: []
    }
  });

  const selectedShiftId = watch('shiftId');
  const wantedDates = watch('wantedDates');
  const acceptedTypes = watch('acceptedTypes');
  const regionPreferences = watch('regionPreferences');
  
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

  // Fetch regions and areas
  useEffect(() => {
    const fetchRegionsAndAreas = async () => {
      try {
        // Fetch regions
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('*')
          .eq('status', 'active');
          
        if (regionsError) throw regionsError;
        
        setRegions(regionsData || []);
        
        // Fetch areas
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .eq('status', 'active');
          
        if (areasError) throw areasError;
        
        setAreas(areasData || []);
      } catch (err) {
        console.error('Error fetching regions/areas:', err);
      }
    };
    
    fetchRegionsAndAreas();
  }, []);

  const onFormSubmit = async (data: FormValues) => {
    if (!data.shiftId || data.wantedDates.length === 0) return;
    
    const acceptedTypesArray: string[] = [];
    if (data.acceptedTypes.day) acceptedTypesArray.push('day');
    if (data.acceptedTypes.afternoon) acceptedTypesArray.push('afternoon');
    if (data.acceptedTypes.night) acceptedTypesArray.push('night');
    
    if (acceptedTypesArray.length === 0) {
      // Must select at least one shift type
      return;
    }
    
    // Format dates to ISO strings (YYYY-MM-DD)
    const formattedDates = data.wantedDates
      .filter(date => date && isValid(date))
      .map(date => format(date, 'yyyy-MM-dd'));
    
    setIsLoading(true);
    try {
      const success = await onSubmit(data.shiftId, formattedDates, acceptedTypesArray);
      
      // If the swap request was created successfully, also save region preferences
      if (success && data.regionPreferences.length > 0) {
        // Note: Saving preferences would need backend support - implement in future update
        console.log('Would save region preferences:', data.regionPreferences);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const selectedShift = shifts.find(shift => shift.id === selectedShiftId);

  const handleAddDate = (date: Date | undefined) => {
    if (date && isValid(date)) {
      const currentDates = [...(wantedDates || [])];
      
      // Check if date already exists
      const dateAlreadySelected = currentDates.some(d => 
        d && format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      if (!dateAlreadySelected) {
        currentDates.push(date);
        setValue('wantedDates', currentDates);
      }
      
      // Close the date picker
      setShowDatePicker(false);
    }
  };

  const handleRemoveDate = (index: number) => {
    const currentDates = [...(wantedDates || [])];
    currentDates.splice(index, 1);
    setValue('wantedDates', currentDates);
  };

  const handleAddRegionPreference = (regionId: string, areaId?: string) => {
    const currentPreferences = [...(regionPreferences || [])];
    
    // Check if this preference already exists
    const alreadyExists = currentPreferences.some(
      pref => pref.regionId === regionId && pref.areaId === areaId
    );
    
    if (!alreadyExists) {
      currentPreferences.push({ regionId, areaId });
      setValue('regionPreferences', currentPreferences);
    }
  };

  const handleRemoveRegionPreference = (index: number) => {
    const currentPreferences = [...(regionPreferences || [])];
    currentPreferences.splice(index, 1);
    setValue('regionPreferences', currentPreferences);
  };

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
              <Controller
                name="shiftId"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={field.onChange}
                    value={field.value}
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
                )}
              />
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
            
            {/* Multiple Wanted Dates */}
            <div className="space-y-2">
              <Label>Dates You Want Instead</Label>
              
              {/* Display selected dates */}
              <div className="flex flex-wrap gap-2 mb-2">
                {(wantedDates || []).map((date, index) => (
                  date && isValid(date) ? (
                    <Badge 
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {format(date, 'MMM d, yyyy')}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveDate(index)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                ))}
                
                {/* Add date button */}
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center text-sm text-primary hover:text-primary/80"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Date
                </button>
              </div>
              
              {/* Date picker */}
              {showDatePicker && (
                <div className="border rounded-md p-2 mb-4">
                  <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={(date) => handleAddDate(date)}
                    initialFocus
                    disabled={(date) => {
                      // Disable dates that are already selected
                      return (wantedDates || []).some(
                        d => d && format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      );
                    }}
                  />
                </div>
              )}
              
              {/* Warning if no dates selected */}
              {(!wantedDates || wantedDates.length === 0) && (
                <p className="text-sm text-yellow-600">
                  Please select at least one preferred date
                </p>
              )}
            </div>
            
            {/* Accepted Shift Types */}
            <div className="space-y-2">
              <Label>Acceptable Shift Types</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select what types of shifts you're willing to accept on your wanted dates.
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
            
            {/* Region/Area Preferences */}
            <div className="space-y-2">
              <Label>Region/Area Preferences</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select regions or specific areas you prefer for your swap.
              </p>
              
              {/* Region selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select 
                  onValueChange={(value) => handleAddRegionPreference(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  onValueChange={(value) => {
                    const [regionId, areaId] = value.split('|');
                    handleAddRegionPreference(regionId, areaId);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={`region-group-${region.id}`} value={region.id} disabled>
                        {region.name}
                      </SelectItem>
                    ))}
                    {areas.map(area => (
                      <SelectItem 
                        key={area.id} 
                        value={`${area.region_id}|${area.id}`}
                        className="pl-6"
                      >
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Display selected preferences */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(regionPreferences || []).map((pref, index) => {
                  const region = regions.find(r => r.id === pref.regionId);
                  const area = pref.areaId ? areas.find(a => a.id === pref.areaId) : null;
                  
                  return (
                    <Badge 
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {region?.name || 'Unknown'} {area && `- ${area.name}`}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveRegionPreference(index)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedShiftId || 
                ((!wantedDates || wantedDates.length === 0)) || 
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
