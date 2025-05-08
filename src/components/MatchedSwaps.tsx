
import { useState, useCallback } from 'react';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { FinalizeSwapDialog } from './matched-swaps/FinalizeSwapDialog';
import { MatchedSwapsTabs } from './matched-swaps/MatchedSwapsTabs';
import { TestingTools } from './matched-swaps/TestingTools';
import { useMatchedSwapsData } from './matched-swaps/hooks/useMatchedSwapsData';
import { useSwapConfirmation } from './matched-swaps/hooks/useSwapConfirmation';
import { useAuth } from '@/hooks/useAuth';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
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
  
  const { isAdmin } = useAuth();
  
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
      fetchMatches(); // Refresh the matches after accepting
    }, 500);
  });
  
  // Debug logging for matches
  console.log("MatchedSwaps - Current matches:", matches);
  console.log("MatchedSwaps - Accepted matches:", matches?.filter(m => m.status === 'accepted'));

  return (
    <div className="space-y-6">
      {/* Show TestingTools to all users, not just admins */}
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
        onRefresh={fetchMatches}
        isLoading={isLoading || isActionLoading}
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
        isLoading={isLoading || isActionLoading}
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
        isLoading={isLoading || isActionLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
