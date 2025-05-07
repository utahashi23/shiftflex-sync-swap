
import React from "react";
import { Card } from "@/components/ui/card";
import { SwapMatch } from "./types";
import { SwapCardHeader } from "./swap-card/SwapCardHeader";
import { SwapCardContent } from "./swap-card/SwapCardContent";
import { SwapCardFooter } from "./swap-card/SwapCardFooter";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
}

export const SwapCard = ({ 
  swap, 
  isPast = false, 
  onAccept, 
  onFinalize, 
  onResendEmail,
  onCancel 
}: SwapCardProps) => {
  // Debug logging for colleague types and status
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType
  });
  
  return (
    <Card className="overflow-hidden">
      <SwapCardHeader status={swap.status} />
      <SwapCardContent swap={swap} />
      <SwapCardFooter 
        swap={swap}
        isPast={isPast}
        onAccept={onAccept}
        onFinalize={onFinalize}
        onCancel={onCancel}
      />
    </Card>
  );
};
