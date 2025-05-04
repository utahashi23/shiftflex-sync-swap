import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { SwapMatch } from "@/hooks/swap-matches/types";

interface MatchCardProps {
  match: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onComplete?: (matchId: string) => void;
}

const MatchCard = ({ match, isPast = false, onAccept, onComplete }: MatchCardProps) => {
  const isAccepted = match.status === 'accepted';
  const isPending = match.status === 'pending';
  
  // Format the dates for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error("Date formatting error:", e);
      return dateString || "Invalid date";
    }
  };
  
  return (
    <Card className={isPast ? "opacity-75" : ""}>
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-lg">Shift Swap Match</CardTitle>
          <div className="text-sm text-muted-foreground flex items-center mt-1">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Matched: {new Date(match.createdAt).toLocaleDateString()}
          </div>
        </div>
        <Badge 
          variant={isPending ? "outline" : isAccepted ? "secondary" : "default"}
          className="capitalize"
        >
          {match.status}
        </Badge>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* My shift details */}
          <div className="p-3 bg-muted rounded-md">
            <div className="font-medium mb-2">My Shift</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {formatDate(match.myShift.date)}
              </div>
              <div>{match.myShift.startTime} - {match.myShift.endTime}</div>
              {match.myShift.truckName && (
                <div className="text-muted-foreground">Truck: {match.myShift.truckName}</div>
              )}
            </div>
          </div>
          
          {/* Other shift details */}
          <div className="p-3 bg-muted rounded-md">
            <div className="font-medium mb-2">Matched Shift</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {formatDate(match.otherShift.date)}
              </div>
              <div>{match.otherShift.startTime} - {match.otherShift.endTime}</div>
              {match.otherShift.truckName && (
                <div className="text-muted-foreground">Truck: {match.otherShift.truckName}</div>
              )}
              <div className="font-medium mt-1">
                {match.otherShift.userName || 'Unknown user'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        {!isPast && (
          <div className="flex justify-end mt-4 gap-2">
            {isPending && onAccept && (
              <Button onClick={() => onAccept(match.id)}>
                Accept Swap
              </Button>
            )}
            {isAccepted && onComplete && (
              <Button 
                variant="outline" 
                onClick={() => onComplete(match.id)}
                className="flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Mark Complete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchCard;
