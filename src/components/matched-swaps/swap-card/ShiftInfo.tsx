
import React from "react";
import { Calendar, Clock, UserCircle2 } from "lucide-react";
import ShiftTypeBadge from "../../swaps/ShiftTypeBadge";

interface ShiftData {
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  colleagueType: string | null;
  truckName?: string | null;
  userName?: string;
}

interface ShiftInfoProps {
  shift: ShiftData;
  title: string;
  testId?: string;
  showUsername?: boolean;
}

// Format date to a readable string
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const ShiftInfo = ({ shift, title, testId, showUsername = false }: ShiftInfoProps) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      
      <div className="p-3 border rounded-md bg-background">
        <div className="flex items-center justify-between">
          <ShiftTypeBadge type={shift.type} />
          {showUsername && shift.userName && (
            <div className="text-xs font-medium text-muted-foreground">
              {shift.userName}
            </div>
          )}
        </div>
        
        <div className="flex items-center mt-2">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm">{formatDate(shift.date)}</span>
        </div>
        
        <div className="flex items-center mt-1">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm">{shift.startTime} - {shift.endTime}</span>
        </div>
        
        <div className="flex items-center mt-1">
          <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm" data-testid={testId}>
            {shift.colleagueType}
          </span>
        </div>
        
        <div className="mt-2 text-xs font-medium text-muted-foreground">
          {shift.truckName || 'Shift'}
        </div>
      </div>
    </div>
  );
};
