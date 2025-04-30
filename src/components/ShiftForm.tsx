
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
import { Combobox } from '@/components/ui/combobox';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Clock, Sun, Sunrise, Moon } from 'lucide-react';

// Mock truck names
const truckNames = [
  "02-MAT01", "02-MAT02", "04-MAT03", "04-MAT04", "04-MAT05", 
  "04-MAT06", "04-MAT17", "06-MAT07", "06-MAT08", "06-MAT09", 
  "08-MAT11", "08-MAT16", "08-MAT17", "08-MAT18", "08-MAT19", 
  "08\\MAT10", "09-MAT12", "09-MAT13", "10-MAT14", "10-MAT15",
  // Add more truck names as needed
];

// Types
interface Shift {
  id?: number;
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
  const [formTitle, setFormTitle] = useState('Add Shift to Calendar');
  const [isLoading, setIsLoading] = useState(false);
  const [truckName, setTruckName] = useState('');
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
      setShiftDate(selectedShift.date);
      setShiftStartTime(selectedShift.startTime);
      setShiftEndTime(selectedShift.endTime);
      setShiftType(selectedShift.type);
      setColleagueType(selectedShift.colleagueType);
      setShiftLength('custom');
    } else if (selectedDate) {
      // Adding new shift
      setFormTitle('Add Shift to Calendar');
      setTruckName('');
      setShiftDate(selectedDate.toISOString().split('T')[0]);
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
  
  // Handle start time change
  const handleStartTimeChange = (time: string) => {
    setShiftStartTime(time);
    
    // Update shift type based on start time
    const [hours] = time.split(':').map(Number);
    if (hours < 8) {
      setShiftType('day');
    } else if (hours < 15) {
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
    setShiftDate('');
    setShiftStartTime('');
    setShiftEndTime('');
    setShiftType('day');
    setColleagueType('Unknown');
    setShiftLength('custom');
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!truckName || !shiftDate || !shiftStartTime || !shiftEndTime) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Create shift object
    const shift: Shift = {
      id: selectedShift?.id,
      date: shiftDate,
      title: truckName,
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      type: shiftType,
      colleagueType: colleagueType,
    };
    
    // In a real app, this would save to the database
    setTimeout(() => {
      if (selectedShift) {
        toast({
          title: "Shift Updated",
          description: `Your ${shiftType} shift on ${new Date(shiftDate).toLocaleDateString()} has been updated.`,
        });
      } else {
        toast({
          title: "Shift Added",
          description: `Your ${shiftType} shift on ${new Date(shiftDate).toLocaleDateString()} has been added.`,
        });
      }
      
      resetSelection();
      resetForm();
      setIsLoading(false);
    }, 1000);
  };
  
  // Handle shift deletion
  const handleDelete = () => {
    if (!selectedShift) return;
    
    setIsLoading(true);
    
    // In a real app, this would delete from the database
    setTimeout(() => {
      toast({
        title: "Shift Deleted",
        description: `Your shift on ${new Date(selectedShift.date).toLocaleDateString()} has been removed.`,
      });
      
      resetSelection();
      resetForm();
      setIsLoading(false);
    }, 1000);
  };
  
  // Check if form is complete
  const isFormComplete = truckName && shiftDate && shiftStartTime && shiftEndTime;
  
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
          <Combobox
            items={truckNames.map(name => ({ value: name, label: name }))}
            value={truckName}
            onChange={setTruckName}
            placeholder="Select or search for a truck name"
          />
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
