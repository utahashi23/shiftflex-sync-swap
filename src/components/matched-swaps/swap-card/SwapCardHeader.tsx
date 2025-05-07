
import React from "react";
import { ArrowRightLeft } from "lucide-react";
import { CardHeader } from "@/components/ui/card";
import { SwapStatusBadge } from "./SwapStatusBadge";

interface SwapCardHeaderProps {
  status: string;
}

export const SwapCardHeader = ({ status }: SwapCardHeaderProps) => {
  return (
    <CardHeader className="bg-secondary/30 pb-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
          <h3 className="text-lg font-medium">Shift Swap</h3>
        </div>
        <div>
          <SwapStatusBadge status={status} />
        </div>
      </div>
    </CardHeader>
  );
};
