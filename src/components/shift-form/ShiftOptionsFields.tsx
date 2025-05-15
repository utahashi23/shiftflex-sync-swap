
import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShiftOptionsFieldsProps {
  shiftLength: string;
  onShiftLengthChange: (length: string) => void;
  colleagueType: string;
  onColleagueTypeChange: (type: string) => void;
}

export const ShiftOptionsFields: React.FC<ShiftOptionsFieldsProps> = ({
  shiftLength,
  onShiftLengthChange,
  colleagueType,
  onColleagueTypeChange
}) => {
  // Fetch shift lengths from database
  const { data: shiftLengths = [] } = useQuery({
    queryKey: ['shiftLengths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_lengths')
        .select('*')
        .eq('status', 'active')
        .order('hours');
        
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch colleague types from database
  const { data: colleagueTypes = [] } = useQuery({
    queryKey: ['colleagueTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleague_types')
        .select('*')
        .eq('status', 'active')
        .order('name');
        
      if (error) throw error;
      return data;
    }
  });
  
  return (
    <>
      <div className="space-y-2 mb-4">
        <Label htmlFor="shiftLength">Shift Length</Label>
        <RadioGroup 
          id="shiftLength" 
          value={shiftLength} 
          onValueChange={onShiftLengthChange}
          className="grid grid-cols-3 sm:grid-cols-6 gap-2"
        >
          {shiftLengths.map((length) => (
            <div key={length.id} className="flex items-center space-x-2">
              <RadioGroupItem value={length.hours.toString()} id={`length-${length.hours}`} />
              <Label htmlFor={`length-${length.hours}`}>{length.hours}h</Label>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom-length" />
            <Label htmlFor="custom-length">Custom</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="colleagueType">Colleague Type</Label>
        <RadioGroup 
          id="colleagueType" 
          value={colleagueType} 
          onValueChange={onColleagueTypeChange}
          className="grid grid-cols-2 gap-2"
        >
          {colleagueTypes.map((type) => (
            <div key={type.id} className="flex items-center space-x-2">
              <RadioGroupItem value={type.name} id={`type-${type.name}`} />
              <Label htmlFor={`type-${type.name}`}>{type.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </>
  );
};
