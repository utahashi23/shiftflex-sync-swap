
import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface ShiftOptionsFieldsProps {
  shiftLength: string;
  onShiftLengthChange: (length: string) => void;
  colleagueType: string;
  onColleagueTypeChange: (type: any) => void;
}

interface ColleagueType {
  id: string;
  name: string;
}

export const ShiftOptionsFields = ({
  shiftLength,
  onShiftLengthChange,
  colleagueType,
  onColleagueTypeChange
}: ShiftOptionsFieldsProps) => {
  const [colleagueTypes, setColleagueTypes] = useState<ColleagueType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchColleagueTypes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('colleague_types')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setColleagueTypes(data);
        } else {
          // If no colleague types found in the database, use default ones
          setColleagueTypes([
            { id: 'Qualified', name: 'Qualified' },
            { id: 'Graduate', name: 'Graduate' },
            { id: 'ACO', name: 'ACO' },
            { id: 'Unknown', name: 'Unknown' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching colleague types:', error);
        // Use default types if there's an error
        setColleagueTypes([
          { id: 'Qualified', name: 'Qualified' },
          { id: 'Graduate', name: 'Graduate' },
          { id: 'ACO', name: 'ACO' },
          { id: 'Unknown', name: 'Unknown' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchColleagueTypes();
  }, []);

  return (
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
          onValueChange={onShiftLengthChange}
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
          onValueChange={onColleagueTypeChange}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select colleague type" />
          </SelectTrigger>
          <SelectContent>
            {colleagueTypes.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
