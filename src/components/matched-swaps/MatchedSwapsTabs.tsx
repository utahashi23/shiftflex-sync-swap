
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { SwapMatch } from "./types";
import { SwapTabContent } from "./SwapTabContent";

interface MatchedSwapsTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  onAcceptSwap?: (matchId: string) => void;
  onFinalizeSwap?: (matchId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isProcessing?: boolean;
}

export const MatchedSwapsTabs = ({
  activeTab,
  setActiveTab,
  matches,
  pastMatches,
  onAcceptSwap,
  onFinalizeSwap,
  onRefresh,
  isLoading = false,
  isProcessing = false
}: MatchedSwapsTabsProps) => {
  // Calculate counts for badges
  const pendingCount = matches ? matches.filter(m => m.status === 'pending').length : 0;
  const acceptedCount = matches ? matches.filter(m => m.status === 'accepted').length : 0;
  const activeCount = pendingCount + acceptedCount;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Matched Swaps</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || isProcessing}
          className="flex gap-1 items-center"
        >
          <RefreshCcw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="active"
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="active" className="relative">
            Active
            {activeCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            {pastMatches && pastMatches.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                {pastMatches.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {isLoading || isProcessing ? (
            <div className="w-full p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : (
            <SwapTabContent 
              swaps={matches} 
              onAcceptSwap={onAcceptSwap} 
              onFinalizeSwap={onFinalizeSwap}
            />
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-6">
          {isLoading || isProcessing ? (
            <div className="w-full p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : (
            <SwapTabContent swaps={pastMatches} isPast={true} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
