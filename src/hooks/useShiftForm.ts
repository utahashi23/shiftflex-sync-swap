
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User } from '@/hooks/useAuth';

// Types
export interface Shift {
  id?: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
}

interface UseShiftFormProps {
  selectedDate: Date | null;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
  resetSelection: () => void;
  user: User | null;
}

export const useShiftForm = ({
  selectedDate,
  selectedShift,
  setSelectedShift,
  resetSelection,
  user
}: UseShiftFormProps) => {
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
      resetFormState();
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
  
  // Reset form state
  const resetFormState = () => {
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
        colleague_type: colleagueType, // Add colleague_type to the database record
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
      resetFormState();
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
      resetFormState();
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
  
  // Handle truck selection
  const handleTruckSelection = (name: string) => {
    setTruckName(name);
    setSearchTerm(name);
    setIsTruckDropdownOpen(false);
  };

  return {
    formTitle,
    isLoading,
    truckName,
    searchTerm,
    isTruckDropdownOpen,
    shiftDate,
    shiftStartTime,
    shiftEndTime,
    shiftType,
    colleagueType,
    shiftLength,
    setSearchTerm,
    setIsTruckDropdownOpen,
    setShiftDate,
    setColleagueType,
    handleSubmit,
    handleDelete,
    handleStartTimeChange,
    handleShiftLengthChange,
    handleTruckSelection,
    isFormComplete: Boolean(truckName && shiftDate && shiftStartTime && shiftEndTime)
  };
};
