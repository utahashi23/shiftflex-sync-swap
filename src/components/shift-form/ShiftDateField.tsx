
import { AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShiftDateFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const ShiftDateField = ({ value, onChange }: ShiftDateFieldProps) => {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
};
