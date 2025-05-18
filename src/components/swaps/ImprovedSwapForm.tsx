
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ShiftSwapDialog } from './ShiftSwapDialog';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Sunrise, 
  Sun, 
  Moon,
  X
} from "lucide-react";
import { format, isValid } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShiftDateField } from '@/components/shift-form/ShiftDateField';
import { toast } from '@/hooks/use-toast';

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
        // Call the RPC function to get shifts
        const { data, error } = await supabase
          .rpc('get_all_shifts')
          .eq('status', 'scheduled');
          
        if (error) throw error;
        
        console.log(`Loaded ${data?.length || 0} shifts for form`);
        setShifts(data || []);
      } catch (err) {
        console.error('Error fetching shifts:', err);
        toast({
          title: "Failed to load shifts",
          description: "There was a problem loading your shifts. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchShifts();
    }
  }, [user, isOpen]);

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
    
    if (isOpen) {
      fetchRegionsAndAreas();
    }
  }, [isOpen]);

  const onFormSubmit = async (data: FormValues) => {
    if (!data.shiftId || data.wantedDates.length === 0) return;
    
    const acceptedTypesArray: string[] = [];
    if (data.acceptedTypes.day) acceptedTypesArray.push('day');
    if (data.acceptedTypes.afternoon) acceptedTypesArray.push('afternoon');
    if (data.acceptedTypes.night) acceptedTypesArray.push('night');
    
    if (acceptedTypesArray.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one shift type",
        variant: "destructive"
      });
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
      
      if (success) {
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedShift = shifts.find(shift => shift.id === selectedShiftId);

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
    <ShiftSwapDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Create Shift Swap Request"
      description="Select the shift you want to swap and specify your preferences."
      onConfirm={handleSubmit(onFormSubmit)}
      isLoading={isLoading}
      confirmLabel="Create Swap Request"
      cancelLabel="Cancel"
      preventAutoClose={true}
    >
      <form className="grid gap-4 py-2">
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
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading shifts..." : "Select a shift to swap"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : shifts.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No shifts available</div>
                  ) : (
                    shifts.map(shift => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {format(new Date(shift.date), 'MMM d, yyyy')} - {shift.truck_name || 'Unknown location'}
                      </SelectItem>
                    ))
                  )}
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
        
        {/* Multiple Wanted Dates with calendar */}
        <div className="space-y-2">
          <Controller
            name="wantedDates"
            control={control}
            render={({ field }) => (
              <ShiftDateField
                value=""
                onChange={() => {}}
                multiSelect={true}
                selectedDates={field.value}
                onMultiDateChange={(dates) => field.onChange(dates)}
              />
            )}
          />
          
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
              disabled={regions.length === 0}
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
              disabled={areas.length === 0}
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
      </form>
    </ShiftSwapDialog>
  );
};
