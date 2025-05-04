
import { useState } from 'react';
import { ConfirmDialogState } from '../types';

/**
 * Hook for managing dialog states in the matched swaps
 */
export const useSwapDialogs = () => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    matchId: null
  });

  return {
    confirmDialog,
    setConfirmDialog
  };
};
