
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

interface ShiftOptionsFieldsProps {
  shiftLength: string;
  onShiftLengthChange: (length: string) => void;
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
  onColleagueTypeChange: (type: any) => void;
}

export const ShiftOptionsFields = ({
  shiftLength,
  onShiftLengthChange,
  colleagueType,
  onColleagueTypeChange
}: ShiftOptionsFieldsProps) => {
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
  );
};
