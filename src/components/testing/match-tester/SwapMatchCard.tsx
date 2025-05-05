
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { MatchTestResult } from "./types";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface SwapMatchCardProps {
  match: MatchTestResult;
  index: number;
  isCreating: boolean;
  onCreateMatch: (match: MatchTestResult) => void;
}

export function SwapMatchCard({ match, index, isCreating, onCreateMatch }: SwapMatchCardProps) {
  const [isCreatingThis, setIsCreatingThis] = useState(false);
  const { user } = useAuth();
  
  const handleCreateMatch = () => {
    setIsCreatingThis(true);
    onCreateMatch(match);
  };
  
  // Determine if the current user is involved in this match
  const isUserInvolved = user && (
    (match.request1User?.id === user.id) || 
    (match.request2User?.id === user.id)
  );
  
  // Format user names with first initial and last name
  const formatUserName = (firstName: string = 'Unknown', lastName: string = 'User') => {
    return `${firstName.charAt(0)}. ${lastName}`;
  };
  
  const request1UserName = formatUserName(
    match.request1User?.first_name,
    match.request1User?.last_name
  );
  
  const request2UserName = formatUserName(
    match.request2User?.first_name,
    match.request2User?.last_name
  );
  
  return (
    <Card className={`overflow-hidden border ${isUserInvolved ? 'border-green-300 shadow-sm bg-green-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">Match #{index + 1}</div>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateMatch}
            disabled={isCreating || isCreatingThis}
          >
            {(isCreating && isCreatingThis) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Creating...
              </>
            ) : (
              <>Create Match</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-1">Request 1</div>
            <div>User: {request1UserName}</div>
            <div>Date: {match.request1ShiftDate}</div>
            <div>
              Time: {match.request1Shift?.start_time?.substring(0, 5) || 'N/A'} - 
              {match.request1Shift?.end_time?.substring(0, 5) || 'N/A'}
            </div>
            {match.request1Shift?.truck_name && (
              <div>Truck: {match.request1Shift.truck_name}</div>
            )}
          </div>

          <div>
            <div className="font-semibold mb-1">Request 2</div>
            <div>User: {request2UserName}</div>
            <div>Date: {match.request2ShiftDate}</div>
            <div>
              Time: {match.request2Shift?.start_time?.substring(0, 5) || 'N/A'} - 
              {match.request2Shift?.end_time?.substring(0, 5) || 'N/A'}
            </div>
            {match.request2Shift?.truck_name && (
              <div>Truck: {match.request2Shift.truck_name}</div>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Reason: {match.matchReason}
        </div>
      </CardContent>
    </Card>
  );
}
