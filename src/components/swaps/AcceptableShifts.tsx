
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { formatDate } from "@/utils/swapUtils";

interface AcceptableShiftsProps {
  types: string[];
  dates: string[];
}

const AcceptableShifts = ({ types, dates }: AcceptableShiftsProps) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Will Accept:</h4>
      <div className="bg-muted/20 rounded-md p-4 border border-muted">
        <div className="mb-3">
          <div className="text-sm font-medium">Acceptable Shift Types:</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {types.map(type => (
              <Badge key={type} variant="outline">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <div className="text-sm font-medium">Acceptable Dates:</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {dates.map(date => (
              <Badge key={date} variant="outline" className="flex items-center">
                <CalendarClock className="h-3 w-3 mr-1" />
                {formatDate(date)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptableShifts;
