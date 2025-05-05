
import { ChevronDown, ChevronUp, Search, Beaker } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '../ui/collapsible';
import { Button } from '../ui/button';
import SimpleMatchTester from '../testing/SimpleMatchTester';
import { SwapMatch } from './types';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface TestingToolsProps {
  showTestingTools: boolean;
  setShowTestingTools: (show: boolean) => void;
  onMatchCreated: () => void;
  matches: SwapMatch[];
  onShowMatchesPopup: () => void;
}

export const TestingTools = ({ 
  showTestingTools,
  setShowTestingTools,
  onMatchCreated,
  matches,
  onShowMatchesPopup
}: TestingToolsProps) => {
  if (!showTestingTools) {
    // Small indicator/toggle when collapsed
    return (
      <div className="flex justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-amber-500 opacity-60 hover:opacity-100 hover:bg-amber-50"
              onClick={() => setShowTestingTools(true)}
              data-testid="show-testing-tools"
            >
              <Beaker className="h-4 w-4 mr-1" />
              <span className="text-xs">Test Tools</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Show testing tools (for development only)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Collapsible
      open={true}
      className="border border-amber-300 rounded-lg bg-amber-50 overflow-hidden"
    >
      <div className="flex justify-between items-center p-4">
        <h2 className="text-lg font-bold text-amber-700">Swap Match Testing</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-amber-400 hover:bg-amber-100"
          onClick={() => setShowTestingTools(false)}
        >
          Hide Testing Tools <ChevronUp className="ml-1 h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-amber-600">
            Test and create matches between swap requests. Created matches will appear in the Active Matches tab.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-400 hover:bg-amber-100 flex items-center"
            onClick={onShowMatchesPopup}
            data-testid="show-matches-popup"
          >
            <Search className="mr-1 h-4 w-4" />
            View Raw Matches ({matches.length})
          </Button>
        </div>
        <SimpleMatchTester onMatchCreated={onMatchCreated} />
      </div>
    </Collapsible>
  );
};
