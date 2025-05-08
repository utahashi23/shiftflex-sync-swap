
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mail } from 'lucide-react';
import { runTestNow } from '@/utils/triggerManualTest';

export function TestMatchButton() {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTest = async () => {
    setIsRunning(true);
    
    try {
      await runTestNow();
      toast({
        title: "Test triggered successfully",
        description: "The match notification test has been triggered. Check your email for the results."
      });
    } catch (error) {
      console.error("Error running test:", error);
      toast({
        title: "Test failed",
        description: "Failed to run the match notification test. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleRunTest}
      disabled={isRunning}
      className="flex items-center gap-2"
    >
      <Mail className="h-4 w-4" />
      {isRunning ? "Running..." : "Run Match Notification Test"}
    </Button>
  );
}
