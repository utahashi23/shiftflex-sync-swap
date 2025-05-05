
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownUp, ChevronDown, ChevronRight } from 'lucide-react';
import SimpleMatchTester from '../testing/SimpleMatchTester';
import { SwapMatch } from './types';

interface TestingToolsProps {
  showTestingTools: boolean;
  setShowTestingTools: (show: boolean) => void;
  onMatchCreated?: () => void;
  matches: SwapMatch[];
}

export const TestingTools = ({ 
  showTestingTools, 
  setShowTestingTools, 
  onMatchCreated,
  matches
}: TestingToolsProps) => {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-gray-700"
          onClick={() => setShowTestingTools(!showTestingTools)}
        >
          {showTestingTools ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          Testing Tools
          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            {matches.length} matches
          </span>
        </Button>
      </div>
      
      {showTestingTools && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="mb-4 text-sm text-amber-800">
            <p className="flex items-center font-medium mb-1">
              <ArrowDownUp className="h-4 w-4 mr-1" />
              Swap Match Testing
            </p>
            <p className="text-xs ml-5">
              Use these tools to test the swap matching functionality.
            </p>
          </div>
          
          <SimpleMatchTester onMatchCreated={onMatchCreated} />
        </div>
      )}
    </>
  );
};
