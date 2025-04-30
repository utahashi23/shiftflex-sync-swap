import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Clock, Sun, Sunrise, Moon } from 'lucide-react';
import { useTruckNames } from '@/hooks/useTruckNames';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
interface Shift {
  id?: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
}

interface ShiftFormProps {
  selectedDate: Date | null;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
  resetSelection: () => void;
}

const ShiftForm = ({ 
  selectedDate,
  selectedShift,
  setSelectedShift,
  resetSelection
}: ShiftFormProps) => {
  // Use our custom hook for truck names
  const { truckNames, isLoading: isLoadingTrucks } = useTruckNames();
  const { user } = useAuth();
  
  const [formTitle, setFormTitle] = useState('Add Shift to Calendar');
  const [isLoading, setIsLoading] = useState(false);
  const [truckName, setTruckName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTruckDropdownOpen, setIsTruckDropdownOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [shiftType, setShiftType] = useState<'day' | 'afternoon' | 'night'>('day');
  const [colleagueType, setColleagueType] = useState<'Qualified' | 'Graduate' | 'ACO' | 'Unknown'>('Unknown');
  const [shiftLength, setShiftLength] = useState('custom');
  
  // Update form based on selection
  useEffect(() => {
    if (selectedShift) {
      // Editing mode
      setFormTitle('Edit Shift');
      setTruckName(selectedShift.title);
      setSearchTerm(selectedShift.title);
      setShiftDate(selectedShift.date);
      setShiftStartTime(selectedShift.startTime);
      setShiftEndTime(selectedShift.endTime);
      setShiftType(selectedShift.type);
      setColleagueType(selectedShift.colleagueType);
      setShiftLength('custom');
    } else if (selectedDate) {
      // Adding new shift - ensure correct timezone handling
      setFormTitle('Add Shift to Calendar');
      setTruckName('');
      setSearchTerm('');
      
      // Format the date correctly in local timezone
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      
      // Use local components to create the date string
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setShiftDate(formattedDate);
      
      setShiftStartTime('');
      setShiftEndTime('');
      setShiftType('day');
      setColleagueType('Unknown');
      setShiftLength('custom');
    } else {
      // No selection
      resetForm();
    }
  }, [selectedShift, selectedDate]);
  
  // Filter truck names based on search term
  const filteredTruckNames = truckNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate end time based on start time and shift length
  const calculateEndTime = (startTime: string, length: string) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    let endDate = new Date(startDate);
    
    switch (length) {
      case '8':
        endDate.setHours(endDate.getHours() + 8);
        break;
      case '10':
        endDate.setHours(endDate.getHours() + 10);
        break;
      case '12':
        endDate.setHours(endDate.getHours() + 12);
        break;
      case '14':
        endDate.setHours(endDate.getHours() + 14);
        break;
      default:
        return shiftEndTime;
    }
    
    return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
  };
  
  // Handle shift length change
  const handleShiftLengthChange = (length: string) => {
    setShiftLength(length);
    if (length !== 'custom' && shiftStartTime) {
      setShiftEndTime(calculateEndTime(shiftStartTime, length));
    }
  };
  
  // Handle start time change with updated shift type calculation
  const handleStartTimeChange = (time: string) => {
    setShiftStartTime(time);
    
    // Update shift type based on start time - UPDATED LOGIC
    const [hours] = time.split(':').map(Number);
    
    if (hours <= 8) {
      setShiftType('day');
    } else if (hours > 8 && hours < 16) {
      setShiftType('afternoon');
    } else {
      setShiftType('night');
    }
    
    // Update end time if a predefined shift length is selected
    if (shiftLength !== 'custom') {
      setShiftEndTime(calculateEndTime(time, shiftLength));
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormTitle('Add Shift to Calendar');
    setTruckName('');
    setSearchTerm('');
    setShiftDate('');
    setShiftStartTime('');
    setShiftEndTime('');
    setShiftType('day');
    setColleagueType('Unknown');
    setShiftLength('custom');
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!truckName || !shiftDate || !shiftStartTime || !shiftEndTime) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save shifts.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare data for database
      const shiftData = {
        user_id: user.id,
        date: shiftDate,
        truck_name: truckName,
        start_time: shiftStartTime,
        end_time: shiftEndTime,
      };
      
      let result;
      
      if (selectedShift?.id) {
        // Update existing shift
        result = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', selectedShift.id);
          
        if (result.error) throw result.error;
        
        toast({
          title: "Shift Updated",
          description: `Your ${shiftType} shift on ${new Date(shiftDate).toLocaleDateString()} has been updated.`,
        });
      } else {
        // Add new shift
        result = await supabase
          .from('shifts')
          .insert(shiftData);
          
        if (result.error) throw result.error;
        
        toast({
          title: "Shift Added",
          description: `Your ${shiftType} shift on ${new Date(shiftDate).toLocaleDateString()} has been added.`,
        });
      }
      
      resetSelection();
      resetForm();
    } catch (error) {
      console.error("Error saving shift:", error);
      toast({
        title: "Error",
        description: "There was a problem saving your shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle shift deletion
  const handleDelete = async () => {
    if (!selectedShift?.id) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', selectedShift.id);
        
      if (error) throw error;
      
      toast({
        title: "Shift Deleted",
        description: `Your shift on ${new Date(selectedShift.date).toLocaleDateString()} has been removed.`,
      });
      
      resetSelection();
      resetForm();
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast({
        title: "Error",
        description: "There was a problem deleting your shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if form is complete
  const isFormComplete = truckName && shiftDate && shiftStartTime && shiftEndTime;
  
  // Handle truck selection
  const handleTruckSelection = (name: string) => {
    setTruckName(name);
    setSearchTerm(name);
    setIsTruckDropdownOpen(false);
  };
  
  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-6">{formTitle}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <Label htmlFor="shift-date">Date</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Select a date on the calendar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="shift-date"
            type="date"
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            required
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <Label htmlFor="truck-name">Truck Name</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter the truck name or identifier</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isLoadingTrucks ? (
            <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
              Loading truck names...
            </div>
          ) : (
            <div className="relative">
              <Input
                id="truck-name-search"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsTruckDropdownOpen(true);
                }}
                onFocus={() => setIsTruckDropdownOpen(true)}
                placeholder="Search for a truck name"
              />
              {isTruckDropdownOpen && searchTerm && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-auto">
                  {filteredTruckNames.length > 0 ? (
                    filteredTruckNames.map((name, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleTruckSelection(name)}
                      >
                        {name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">No truck names found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="shift-length">Shift Length</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select a predefined shift length or use custom times</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={shiftLength}
              onValueChange={handleShiftLengthChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shift length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 Hours</SelectItem>
                <SelectItem value="10">10 Hours</SelectItem>
                <SelectItem value="12">12 Hours</SelectItem>
                <SelectItem value="14">14 Hours</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="colleague-type">Colleague Type</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Specify who you'll be working with</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={colleagueType}
              onValueChange={(value: any) => setColleagueType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select colleague type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Graduate">Graduate</SelectItem>
                <SelectItem value="ACO">ACO</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="start-time">Start Time</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>When your shift begins</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="start-time"
              type="time"
              value={shiftStartTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              required
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="end-time">End Time</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>When your shift ends</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="end-time"
              type="time"
              value={shiftEndTime}
              onChange={(e) => setShiftEndTime(e.target.value)}
              disabled={shiftLength !== 'custom'}
              required
            />
          </div>
        </div>
        
        <div className="mt-2 p-3 border rounded-md bg-secondary/20 flex items-center">
          <Clock className="h-5 w-5 text-primary mr-3" />
          <div className="text-sm">
            <p className="font-medium">Shift Type</p>
            <div className="flex items-center mt-1 gap-4">
              <div className="flex items-center">
                {shiftType === 'day' ? (
                  <div className="p-1 bg-yellow-100 rounded-full mr-1">
                    <Sunrise className="h-4 w-4 text-yellow-800" />
                  </div>
                ) : shiftType === 'afternoon' ? (
                  <div className="p-1 bg-orange-100 rounded-full mr-1">
                    <Sun className="h-4 w-4 text-orange-800" />
                  </div>
                ) : (
                  <div className="p-1 bg-blue-100 rounded-full mr-1">
                    <Moon className="h-4 w-4 text-blue-800" />
                  </div>
                )}
                <span>{shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} Shift</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {selectedShift ? (
            <>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!isFormComplete || isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={resetSelection}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!isFormComplete || isLoading}
              >
                {isLoading ? "Adding..." : "Add Shift"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={resetSelection}
                disabled={!selectedDate}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ShiftForm;
