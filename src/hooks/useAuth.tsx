
// Import and re-export from the auth barrel file
import { AuthProvider, useAuth } from './auth';
import type { ExtendedUser, AuthContextType } from './auth/types';

export { AuthProvider, useAuth };
export type { ExtendedUser, AuthContextType };
