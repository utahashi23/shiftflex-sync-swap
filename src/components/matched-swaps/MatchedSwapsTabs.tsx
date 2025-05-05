
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { SwapMatch } from "./types";
import { SwapTabContent } from "./SwapTabContent";

interface MatchedSwapsTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  onAcceptSwap?: (matchId: string) => void;
  onFinalizeSwap?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  onRefresh?: () => void;
  isLoading: boolean;
  isProcessing: boolean;
}

export const MatchedSwapsTabs: React.FC<MatchedSwapsTabsProps> = ({
  activeTab,
  setActiveTab,
  matches,
  pastMatches,
  onAcceptSwap,
  onFinalizeSwap,
  onResendEmail,
  onRefresh,
  isLoading,
  isProcessing
}) => {
  return (
    <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="active" disabled={isLoading}>Active</TabsTrigger>
          <TabsTrigger value="past" disabled={isLoading}>Past</TabsTrigger>
        </TabsList>
        
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || isProcessing}
          >
            {isLoading || isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </>
            )}
          </Button>
        )}
      </div>
      
      <TabsContent value="active" className="mt-0">
        <SwapTabContent 
          swaps={matches} 
          onAcceptSwap={onAcceptSwap}
          onFinalizeSwap={onFinalizeSwap}
          onResendEmail={onResendEmail}
        />
      </TabsContent>
      
      <TabsContent value="past" className="mt-0">
        <SwapTabContent swaps={pastMatches} isPast />
      </TabsContent>
    </Tabs>
  );
};
