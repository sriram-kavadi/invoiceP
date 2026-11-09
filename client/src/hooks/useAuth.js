import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context.
 *
 * Returns:
 *   user       - The currently authenticated user object (or null)
 *   business   - The business profile associated with the user (or null)
 *   login      - async (email, password) => void
 *   logout     - async () => void
 *   register   - async (userData) => void
 *   isLoading  - boolean indicating a pending auth operation
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default useAuth;
