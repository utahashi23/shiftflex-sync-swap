
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '../ui/collapsible';
import { Button } from '../ui/button';
import SimpleMatchTester from '../testing/SimpleMatchTester';

interface TestingToolsProps {
  showTestingTools: boolean;
  setShowTestingTools: (show: boolean) => void;
  onMatchCreated: () => void;
}

export const TestingTools = ({ 
  showTestingTools,
  setShowTestingTools,
  onMatchCreated 
}: TestingToolsProps) => {
  return (
    <Collapsible
      open={showTestingTools}
      onOpenChange={setShowTestingTools}
      className="border border-amber-300 rounded-lg bg-amber-50 overflow-hidden"
    >
      <div className="flex justify-between items-center p-4">
        <h2 className="text-lg font-bold text-amber-700">Swap Match Testing</h2>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="border-amber-400 hover:bg-amber-100">
            {showTestingTools ? (
              <>Hide Testing Tools <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Show Testing Tools <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 pt-0">
          <p className="text-sm text-amber-600 mb-4">
            Test and create matches between swap requests. Created matches will appear in the Active Matches tab.
          </p>
          <SimpleMatchTester onMatchCreated={onMatchCreated} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
