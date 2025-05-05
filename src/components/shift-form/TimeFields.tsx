
import { AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimeFieldsProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  isEndTimeDisabled: boolean;
}

export const TimeFields = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  isEndTimeDisabled
}: TimeFieldsProps) => {
  return (
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
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
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
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          disabled={isEndTimeDisabled}
          required
        />
      </div>
    </div>
  );
};
