
import { useMatchedSwaps } from './matched-swaps/useMatchedSwaps';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { SwapTabContent } from './matched-swaps/SwapTabContent';
import { Button } from "./ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Filter, RefreshCw } from 'lucide-react';
import { useSwapMatcher } from '@/hooks/swap-matching';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface MatchedSwapsProps {
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  const {
    swapRequests,
    pastSwaps,
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    isLoading,
    handleAcceptSwap,
    refreshMatches
  } = useMatchedSwaps();

  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  
  // Ensure we refresh once on mount
  useEffect(() => {
    if (user) {
      console.log('Initial fetch of matched swaps');
      refreshMatches();
    }
  }, [user]);

  const handleAcceptClick = (swapId: string) => {
    setConfirmDialog({ isOpen: true, swapId });
  };

  const handleFindMatches = async () => {
    if (!user) return;

    // Force check for matches even if already matched
    await findSwapMatches(user.id, true);
    
    // Wait a moment for the database operations to complete
    setTimeout(() => {
      // Refresh the matched swaps data
      refreshMatches();
      // Update the parent refresh trigger to update all tabs
      setRefreshTrigger(prev => prev + 1);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button 
              onClick={handleFindMatches}
              disabled={isProcessing || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing || isLoading ? 'animate-spin' : ''}`} />
              {isProcessing || isLoading ? 'Loading...' : 'Find Matches'}
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-1" /> Filter
            </Button>
          </div>
        </div>
        
        <TabsContent value="active">
          <SwapTabContent 
            swaps={swapRequests} 
            onAcceptSwap={handleAcceptClick}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="past">
          <SwapTabContent 
            swaps={pastSwaps} 
            isPast={true}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <SwapConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({ isOpen: false, swapId: null });
          }
        }}
        onConfirm={handleAcceptSwap}
        isLoading={isLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
