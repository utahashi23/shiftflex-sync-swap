
import { AlertCircle } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormCustomization } from '@/hooks/useFormCustomization';

interface ShiftOptionsFieldsProps {
  shiftLength: string;
  onShiftLengthChange: (length: string) => void;
  colleagueType: string;
  onColleagueTypeChange: (type: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown') => void;
}

export const ShiftOptionsFields = ({
  shiftLength,
  onShiftLengthChange,
  colleagueType,
  onColleagueTypeChange
}: ShiftOptionsFieldsProps) => {
  const { settings, isLoading } = useFormCustomization();

  // Add debugging
  console.log("ShiftOptionsFields - settings:", settings);
  console.log("ShiftOptionsFields - show_colleague_type:", settings.show_colleague_type);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Shift Length Field */}
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
                <p>Choose a predefined shift length or select custom to set your own times</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select value={shiftLength} onValueChange={onShiftLengthChange}>
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

      {/* Colleague Type Field - Only show if enabled in settings */}
      {settings.show_colleague_type && (
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
                  <p>Select your qualification level or role type</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={colleagueType} onValueChange={onColleagueTypeChange}>
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
      )}

      {/* Debug info - remove this after testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="col-span-full text-xs text-gray-500 border p-2 rounded">
          Debug: show_colleague_type = {String(settings.show_colleague_type)}, 
          isLoading = {String(isLoading)}
        </div>
      )}
    </div>
  );
};
