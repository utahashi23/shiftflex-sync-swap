
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRightLeft, Calendar, Clock } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "@/hooks/useSwapMatches";
import { Badge } from "@/components/ui/badge";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
}

// Format date to a readable string
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const SwapCard = ({ swap, isPast = false, onAccept }: SwapCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30 pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Shift Swap</h3>
          </div>
          <div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              swap.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              swap.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Shift */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Your Shift</h4>
            
            <div className="p-3 border rounded-md bg-background">
              <div className="flex items-center justify-between">
                <ShiftTypeBadge type={swap.myShift.type} />
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.myShift.date)}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.myShift.startTime} - {swap.myShift.endTime}</span>
              </div>
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {swap.myShift.truckName || 'Shift'}
              </div>
            </div>
          </div>
          
          {/* Their Shift */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {isPast ? 'Completed Swap' : 'Matched Shift'}
            </h4>
            
            <div className="p-3 border rounded-md bg-background">
              <div className="flex items-center justify-between">
                <ShiftTypeBadge type={swap.otherShift.type} />
                <div className="text-xs font-medium text-muted-foreground">
                  {swap.otherShift.userName}
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.otherShift.date)}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.otherShift.startTime} - {swap.otherShift.endTime}</span>
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {swap.otherShift.truckName || 'Shift'}
                </span>
                {swap.otherShift.colleagueType && (
                  <Badge variant="outline" className={`
                    ${swap.otherShift.colleagueType === 'Graduate' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      swap.otherShift.colleagueType === 'ACO' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      swap.otherShift.colleagueType === 'Qualified' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'}
                  `}>
                    {swap.otherShift.colleagueType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {!isPast && swap.status === 'pending' && onAccept && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <div className="w-full flex justify-end">
            <Button 
              onClick={() => onAccept(swap.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Swap
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
