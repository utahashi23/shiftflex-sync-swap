
import React from "react";
import { AlertTriangle } from "lucide-react";

export const WarningMessage = () => {
  return (
    <div className="mt-4 p-3 border border-yellow-300 rounded-md bg-yellow-50">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            This shift has already been accepted by another user
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            The shift you were interested in is no longer available as it has been accepted in another swap.
          </p>
        </div>
      </div>
    </div>
  );
};
