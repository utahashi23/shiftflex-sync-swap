
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw } from "lucide-react";
import { SwapMatch } from "./types";
import { SwapTabContent } from "./SwapTabContent";
import { EmptySwapState } from "./EmptySwapState";

interface MatchedSwapsTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  matches?: SwapMatch[];
  pastMatches?: SwapMatch[];
  onAcceptSwap?: (matchId: string) => void;
  onFinalizeSwap?: (matchId: string) => void;
  onCancelSwap?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isProcessing?: boolean;
}

export function MatchedSwapsTabs({
  activeTab,
  setActiveTab,
  matches = [],
  pastMatches = [],
  onAcceptSwap,
  onFinalizeSwap,
  onCancelSwap,
  onResendEmail,
  onRefresh,
  isLoading = false,
  isProcessing = false
}: MatchedSwapsTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <div className="flex justify-between items-center mb-6">
        <TabsList>
          <TabsTrigger value="active">Active Swaps</TabsTrigger>
          <TabsTrigger value="past">Past Swaps</TabsTrigger>
        </TabsList>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading || isProcessing}
        >
          <RefreshCcw className={`h-4 w-4 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <TabsContent value="active" className="mt-4">
        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <SwapTabContent 
            swaps={matches}
            onAcceptSwap={onAcceptSwap}
            onFinalizeSwap={onFinalizeSwap}
            onCancelSwap={onCancelSwap}
            onResendEmail={onResendEmail}
          />
        )}
      </TabsContent>
      
      <TabsContent value="past" className="mt-4">
        {isLoading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <SwapTabContent 
            swaps={pastMatches} 
            isPast={true}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
