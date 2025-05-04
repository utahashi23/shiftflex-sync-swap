
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
import { Filter } from 'lucide-react';

const MatchedSwapsComponent = () => {
  const {
    swapRequests,
    pastSwaps,
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    isLoading,
    handleAcceptSwap
  } = useMatchedSwaps();

  const handleAcceptClick = (swapId: string) => {
    setConfirmDialog({ isOpen: true, swapId });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
        </div>
        
        <TabsContent value="active">
          <SwapTabContent 
            swaps={swapRequests} 
            onAcceptSwap={handleAcceptClick}
          />
        </TabsContent>
        
        <TabsContent value="past">
          <SwapTabContent 
            swaps={pastSwaps} 
            isPast={true}
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
