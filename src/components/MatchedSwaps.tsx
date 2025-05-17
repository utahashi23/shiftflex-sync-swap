
import { useState, useCallback } from 'react';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { FinalizeSwapDialog } from './matched-swaps/FinalizeSwapDialog';
import { MatchedSwapsTabs } from './matched-swaps/MatchedSwapsTabs';
import { TestingTools } from './matched-swaps/TestingTools';
import { useMatchedSwapsData } from './matched-swaps/hooks/useMatchedSwapsData';
import { useSwapConfirmation } from './matched-swaps/hooks/useSwapConfirmation';
import { useSwapMatches } from '@/hooks/swap-matches';
import { useAuth } from '@/hooks/useAuth';
import { SwapMatch as ComponentSwapMatch } from './matched-swaps/types';
import { SwapMatch as HookSwapMatch } from '@/hooks/swap-matches/types';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

// Adapter function to convert hook type to component type
function adaptSwapMatchType(match: HookSwapMatch): ComponentSwapMatch {
  return {
    ...match,
    myShift: {
      ...match.myShift,
      truckName: match.myShift.truckName || null,
      // Ensure type is one of the allowed types
      type: (match.myShift.type === 'day' || match.myShift.type === 'afternoon' || 
             match.myShift.type === 'night') ? match.myShift.type : 'unknown'
    },
    otherShift: {
      ...match.otherShift,
      truckName: match.otherShift.truckName || null,
      // Ensure type is one of the allowed types
      type: (match.otherShift.type === 'day' || match.otherShift.type === 'afternoon' || 
             match.otherShift.type === 'night') ? match.otherShift.type : 'unknown'
    },
    // Make sure to pass along the acceptance tracking fields
    requesterHasAccepted: match.requesterHasAccepted || false,
    acceptorHasAccepted: match.acceptorHasAccepted || false
  };
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  // Use the consolidated hook from swap-matches
  const {
    matches: hookMatches,
    pastMatches: hookPastMatches,
    isLoading: isMatchesLoading,
    fetchMatches,
    cancelMatch
  } = useSwapMatches();
  
  // Adapt the matches to the component's expected type
  const matches: ComponentSwapMatch[] = hookMatches ? hookMatches.map(adaptSwapMatchType) : [];
  const pastMatches: ComponentSwapMatch[] = hookPastMatches ? hookPastMatches.map(adaptSwapMatchType) : [];
  
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
  
  // Handler for canceling a swap using the hook's cancelMatch function
  const handleCancel = useCallback(async (matchId: string) => {
    if (!matchId) return;
    
    try {
      const success = await cancelMatch(matchId);
      if (success) {
        // Refresh the matches after a successful cancel
        refreshMatches();
      }
    } catch (error) {
      console.error('Error canceling swap:', error);
    }
  }, [cancelMatch, refreshMatches]);
  
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
        onCancelSwap={handleCancel}  // Use our local handler that calls the hook's cancelMatch
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
