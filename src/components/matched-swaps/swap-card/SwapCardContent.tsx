
import React from "react";
import { CardContent } from "@/components/ui/card";
import { ShiftInfo } from "./ShiftInfo";
import { WarningMessage } from "./WarningMessage";
import { SwapMatch } from "../types";

interface SwapCardContentProps {
  swap: SwapMatch;
}

export const SwapCardContent = ({ swap }: SwapCardContentProps) => {
  return (
    <CardContent className="pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Shift */}
        <ShiftInfo 
          shift={swap.myShift} 
          title="Your Shift"
          testId="my-colleague-type"
        />
        
        {/* Their Shift */}
        <ShiftInfo 
          shift={swap.otherShift} 
          title="Matched Shift"
          testId="other-colleague-type"
          showUsername={true}
        />
      </div>
      
      {/* Display warning for other_accepted status */}
      {swap.status === 'other_accepted' && <WarningMessage />}
    </CardContent>
  );
};
