
import { useState, useCallback } from 'react';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { FinalizeSwapDialog } from './matched-swaps/FinalizeSwapDialog';
import { MatchedSwapsTabs } from './matched-swaps/MatchedSwapsTabs';
import { TestingTools } from './matched-swaps/TestingTools';
import { useMatchedSwapsData } from './matched-swaps/hooks/useMatchedSwapsData';
import { useSwapConfirmation } from './matched-swaps/hooks/useSwapConfirmation';
import { useSwapMatches } from '@/hooks/swap-matches';
import { useAuth } from '@/hooks/useAuth';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  // Use the consolidated hook from swap-matches
  const {
    matches,
    pastMatches,
    isLoading: isMatchesLoading,
    fetchMatches
  } = useSwapMatches();
  
  // Use our existing hooks for UI state and actions
  const {
    isLoading: isDataLoading,
    isProcessing
  } = useMatchedSwapsData(setRefreshTrigger);
  
  const { isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState('active');
  
  const {
    confirmDialog,
    setConfirmDialog,
    finalizeDialog,
    setFinalizeDialog,
    isLoading: isActionLoading,
    handleAcceptClick,
    handleFinalizeClick,
    handleAcceptSwap,
    handleFinalizeSwap,
    handleResendEmail,
    handleCancelSwap
  } = useSwapConfirmation(() => {
    // Callback after successful acceptance - use setRefreshTrigger after a delay to avoid infinite re-renders
    setTimeout(() => {
      if (setRefreshTrigger) {
        setRefreshTrigger(prev => prev + 1);
      }
      fetchMatches(true, false); // Explicitly request matches with userInitiatorOnly=false
    }, 500);
  });
  
  // Combine loading states
  const isLoading = isMatchesLoading || isDataLoading || isActionLoading;
  
  // Callback to refresh matches
  const refreshMatches = useCallback(() => {
    fetchMatches(true, false); // Set userInitiatorOnly to false to get all matches
  }, [fetchMatches]);
  
  // Debug logging for matches
  console.log("MatchedSwaps - Current matches:", matches);
  console.log("MatchedSwaps - Accepted matches:", matches?.filter(m => m.status === 'accepted'));

  return (
    <div className="space-y-6">
      {/* Show TestingTools only to admin users (component internally checks isAdmin as well) */}
      <TestingTools />

      {/* Matched Swaps Tabs */}
      <MatchedSwapsTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        matches={matches}
        pastMatches={pastMatches}
        onAcceptSwap={handleAcceptClick}
        onFinalizeSwap={handleFinalizeClick}
        onCancelSwap={handleCancelSwap}
        onResendEmail={handleResendEmail}
        onRefresh={refreshMatches}
        isLoading={isLoading}
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
        isLoading={isLoading}
      />

      {/* Finalize Dialog */}
      <FinalizeSwapDialog
        open={finalizeDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFinalizeDialog({ isOpen: false, matchId: null });
          }
        }}
        onConfirm={handleFinalizeSwap}
        isLoading={isLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
