
import { Button } from "@/components/ui/button";
import { triggerHourlyMatchNotification } from "@/utils/triggerHourlyCheck";
import { useState } from "react";

/**
 * Debug tools for testing email and notification functionality
 */
export const TestingTools = () => {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerHourlyCheck = async () => {
    setIsTriggering(true);
    try {
      await triggerHourlyMatchNotification();
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
      <h3 className="text-sm font-medium">Testing Tools</h3>

      <div className="space-y-2">
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTriggerHourlyCheck} 
            disabled={isTriggering}
          >
            {isTriggering ? "Triggering..." : "Trigger Hourly Match Check"}
          </Button>
          <p className="text-xs text-gray-500">
            Manually trigger the hourly match notification check
          </p>
        </div>
      </div>
    </div>
  );
};
