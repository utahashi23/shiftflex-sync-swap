
import { Badge } from "@/components/ui/badge";
import { Clock, Truck } from "lucide-react";
import { ShiftData } from "@/types/swapTypes";
import { formatDate } from "@/utils/swapUtils";

interface OriginalShiftProps {
  shift: ShiftData;
}

const OriginalShift = ({ shift }: OriginalShiftProps) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Shift:</h4>
      <div className="bg-primary/5 rounded-md p-4 border border-primary/10">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-medium">{formatDate(shift.date)}</div>
            <div className="text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 inline mr-1" />
              {shift.startTime} - {shift.endTime}
            </div>
          </div>
          <Badge variant="outline" className="font-medium">
            <Truck className="h-3 w-3 mr-1" />
            {shift.title}
          </Badge>
        </div>
        <div className="text-sm">
          <Badge variant="secondary" className={
            shift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
            shift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
            "bg-blue-100 text-blue-800"
          }>
            {shift.type.charAt(0).toUpperCase() + shift.type.slice(1)} Shift
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default OriginalShift;
