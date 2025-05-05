
import { useState, useCallback } from 'react';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { TestingTools } from './matched-swaps/TestingTools';
import { MatchedSwapsTabs } from './matched-swaps/MatchedSwapsTabs';
import { useMatchedSwapsData } from './matched-swaps/hooks/useMatchedSwapsData';
import { useSwapConfirmation } from './matched-swaps/hooks/useSwapConfirmation';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  const [showTestingTools, setShowTestingTools] = useState(false); // Set to false by default
  
  // Use our custom hooks
  const {
    matches,
    pastMatches,
    isLoading,
    isProcessing,
    activeTab,
    setActiveTab,
    fetchMatches
  } = useMatchedSwapsData(setRefreshTrigger);
  
  const {
    confirmDialog,
    setConfirmDialog,
    isLoading: isAcceptLoading,
    handleAcceptClick,
    handleAcceptSwap
  } = useSwapConfirmation(() => {
    // Callback after successful acceptance - use setRefreshTrigger after a delay to avoid infinite re-renders
    setTimeout(() => {
      if (setRefreshTrigger) {
        setRefreshTrigger(prev => prev + 1);
      }
      fetchMatches(); // Refresh the matches after accepting
    }, 500);
  });

  return (
    <div className="space-y-6">
      {/* Testing Tools Section */}
      <TestingTools 
        showTestingTools={showTestingTools}
        setShowTestingTools={setShowTestingTools}
        onMatchCreated={fetchMatches}
        matches={matches}
      />
      
      {/* Matched Swaps Tabs */}
      <MatchedSwapsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matches={matches}
        pastMatches={pastMatches}
        onAcceptSwap={handleAcceptClick}
        onRefresh={fetchMatches}
        isLoading={isLoading || isAcceptLoading}
        isProcessing={isProcessing}
      />

      {/* Confirmation Dialog */}
      <SwapConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({ isOpen: false, matchId: null });
          }
        }}
        onConfirm={handleAcceptSwap}
        isLoading={isLoading || isAcceptLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
