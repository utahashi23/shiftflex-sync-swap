
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwapCard } from '@/components/matched-swaps/SwapCard';
import { MatchTestResult } from "./types";
import { Loader2 } from "lucide-react";

interface SwapMatchCardProps {
  match: MatchTestResult;
  index: number;
  isCreating: boolean;
  onCreateMatch: (match: MatchTestResult) => void;
}

export function SwapMatchCard({ match, index, isCreating, onCreateMatch }: SwapMatchCardProps) {
  // Create SwapMatch objects for displaying
  const getShiftType = (startTime: string): string => {
    if (!startTime) return 'unknown';
    
    const hour = parseInt(startTime.split(':')[0], 10);
    
    if (hour <= 8) return 'day';
    if (hour > 8 && hour < 16) return 'afternoon';
    return 'night';
  };
  
  // Helper to create a swap match for the card component
  const createSwapMatchCard = (match: MatchTestResult) => {
    const shift1 = match.request1Shift;
    const shift2 = match.request2Shift;
    
    if (!shift1 || !shift2) return null;
    
    const user1 = match.request1User;
    const user2 = match.request2User;
    
    return {
      id: `potential-${match.request1Id}-${match.request2Id}`,
      status: 'potential',
      myShift: {
        id: shift1.id,
        date: shift1.date,
        startTime: shift1.start_time,
        endTime: shift1.end_time,
        truckName: shift1.truck_name,
        type: getShiftType(shift1.start_time)
      },
      otherShift: {
        id: shift2.id,
        date: shift2.date,
        startTime: shift2.start_time,
        endTime: shift2.end_time,
        truckName: shift2.truck_name,
        type: getShiftType(shift2.start_time),
        userId: shift2.user_id,
        userName: user2 ? `${user2.first_name} ${user2.last_name}` : 'Unknown User'
      },
      myRequestId: match.request1Id,
      otherRequestId: match.request2Id,
      createdAt: new Date().toISOString()
    };
  };
  
  const swapMatch = createSwapMatchCard(match);
  
  if (!swapMatch) return null;
  
  return (
    <div className="border border-green-200 rounded-md p-3">
      <div className="flex justify-between mb-3">
        <div className="font-semibold">Potential Match #{index + 1}</div>
        <Button 
          size="sm" 
          variant="default"
          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
          onClick={() => onCreateMatch(match)}
          disabled={isCreating}
        >
          {isCreating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Create This Match
        </Button>
      </div>
      
      <SwapCard 
        swap={swapMatch} 
        isPast={false}
      />
      
      <div className="mt-2">
        <Badge variant="outline" className="bg-green-100">{match.matchReason}</Badge>
      </div>
    </div>
  );
}
