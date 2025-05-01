import { useMatchedSwaps } from './matched-swaps/useMatchedSwaps';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { SwapTabContent } from './matched-swaps/SwapTabContent';
import { Button } from "./ui/button";
import { DebugPanel } from './matched-swaps/DebugPanel';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Filter, RefreshCw } from 'lucide-react';
import { useSwapMatches } from '@/hooks/swap-matches';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  // Use the direct hook for better debugging and access to raw API data
  const {
    matches,
    pastMatches,
    rawApiData,
    isLoading,
    error,
    fetchMatches
  } = useSwapMatches();

  const {
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    handleAcceptSwap,
  } = useMatchedSwaps();

  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  };

  const handleFindMatches = async () => {
    await fetchMatches();
    
    // If passed from parent, update the parent refresh trigger to update all tabs
    if (setRefreshTrigger) {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Log debug info
  console.log('Matched swaps component:', {
    matchCount: matches.length,
    pastMatchCount: pastMatches.length,
    isLoading,
    hasError: !!error
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button 
              onClick={handleFindMatches}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Finding Matches...' : 'Refresh Matches'}
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-1" /> Filter
            </Button>
          </div>
        </div>
        
        <TabsContent value="active">
          <SwapTabContent 
            swaps={matches} 
            onAcceptSwap={handleAcceptClick}
          />
        </TabsContent>
        
        <TabsContent value="past">
          <SwapTabContent 
            swaps={pastMatches} 
            isPast={true}
          />
        </TabsContent>
      </Tabs>

      {/* Debug panel */}
      <DebugPanel
        matches={matches}
        rawData={rawApiData}
        error={error}
        onRefresh={handleFindMatches}
        isLoading={isLoading}
      />

      <SwapConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({ isOpen: false, matchId: null });
          }
        }}
        onConfirm={handleAcceptSwap}
        isLoading={isLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
