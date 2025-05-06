
// The special user ID
export const SPECIAL_USER_ID = "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5";

// Check if a user is the special user
export const isSpecialUser = (userId?: string): boolean => {
  return userId === SPECIAL_USER_ID;
};

// Determine if action buttons should be hidden
export const shouldHideActionButtons = (
  myUserId?: string,
  otherUserId?: string,
  swapStatus?: string,
  isAcceptedByOthers?: boolean
): boolean => {
  // Special user should never see action buttons
  const isCurrentUserSpecial = isSpecialUser(myUserId);
  
  // If current user is not special but other user is special, also hide the buttons for accepted swaps
  const hideForSpecialUserSwap = !isCurrentUserSpecial && 
                               isSpecialUser(otherUserId) && 
                               swapStatus === 'accepted';
  
  // Hide buttons if this swap has already been accepted by others
  // This ensures users don't try to accept swaps that are already in process elsewhere
  const hideForAlreadyAcceptedSwap = isAcceptedByOthers === true;
  
  return isCurrentUserSpecial || hideForSpecialUserSwap || hideForAlreadyAcceptedSwap;
};
