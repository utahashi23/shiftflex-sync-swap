
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { SwapTabContent } from './SwapTabContent';
import { SwapMatch } from '@/hooks/swap-matches';

interface MatchedSwapsTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  onAcceptSwap: (matchId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isProcessing: boolean;
}

export const MatchedSwapsTabs = ({
  activeTab,
  setActiveTab,
  matches,
  pastMatches,
  onAcceptSwap,
  onRefresh,
  isLoading,
  isProcessing
}: MatchedSwapsTabsProps) => {
  return (
    <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="active">Active Matches ({matches.length})</TabsTrigger>
          <TabsTrigger value="past">Past Swaps ({pastMatches.length})</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button 
            onClick={onRefresh}
            disabled={isLoading || isProcessing}
            className="bg-green-500 hover:bg-green-600 text-white"
            data-testid="find-matches-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isProcessing) ? 'animate-spin' : ''}`} />
            {(isLoading || isProcessing) ? 'Finding Matches...' : 'Find Matches'}
          </Button>
        </div>
      </div>
      
      <TabsContent value="active" className="min-h-[200px]">
        <SwapTabContent 
          swaps={matches} 
          onAcceptSwap={onAcceptSwap}
        />
      </TabsContent>
      
      <TabsContent value="past" className="min-h-[200px]">
        <SwapTabContent 
          swaps={pastMatches} 
          isPast={true}
        />
      </TabsContent>
    </Tabs>
  );
};
