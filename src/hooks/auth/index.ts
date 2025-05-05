
// Auth module barrel file - corrected to avoid circular dependencies
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import type { ExtendedUser, AuthContextType } from './types';

export { AuthProvider, useAuth };
export type { ExtendedUser, AuthContextType };
