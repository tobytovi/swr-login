import { isTokenExpired } from '@swr-login/core';
import { useMemo } from 'react';
import { useAuthContext } from '../context';

export interface SessionInfo {
  /** Current access token */
  accessToken: string | null;
  /** Current refresh token */
  refreshToken: string | null;
  /** Token expiration timestamp (ms since epoch) */
  expiresAt: number | null;
  /** Whether the access token has expired */
  isExpired: boolean;
  /** Whether tokens exist (regardless of expiry) */
  hasTokens: boolean;
}

/**
 * Hook to access raw session/token information.
 *
 * Useful for:
 * - Adding Authorization headers to custom requests
 * - Checking token expiry status
 * - Debugging session state
 *
 * @example
 * ```tsx
 * const { accessToken, isExpired } = useSession();
 *
 * const fetchData = () => fetch('/api/data', {
 *   headers: { Authorization: `Bearer ${accessToken}` },
 * });
 * ```
 */
export function useSession(): SessionInfo {
  const { tokenManager } = useAuthContext();

  return useMemo(() => {
    const accessToken = tokenManager.getAccessToken();
    const refreshToken = tokenManager.getRefreshToken();
    const expiresAt = tokenManager.getAccessToken() ? tokenManager.getExpiresAt() : null;

    return {
      accessToken,
      refreshToken,
      expiresAt,
      isExpired: isTokenExpired(expiresAt),
      hasTokens: !!accessToken,
    };
  }, [tokenManager]);
}
