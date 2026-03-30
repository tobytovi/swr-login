import type { AuthEventEmitter } from './event-emitter';
import { TokenExpiredError, TokenRefreshError } from './errors';
import type { AuthStateMachine } from './state-machine';
import type { AuthResponse, TokenAdapter } from './types';
import { isTokenExpired } from './utils';

/** Token refresh function type */
export type RefreshFunction = (refreshToken: string) => Promise<AuthResponse>;

/**
 * Token Manager with silent refresh queue.
 *
 * Features:
 * - Automatic token expiry detection
 * - Single-promise lock to prevent concurrent refresh requests
 * - Request queue: pending requests are held during refresh and retried after
 * - Emits events on refresh success/failure
 */
export class TokenManager {
  private adapter: TokenAdapter;
  private emitter: AuthEventEmitter;
  private stateMachine: AuthStateMachine;
  private refreshFn?: RefreshFunction;
  private refreshPromise: Promise<AuthResponse> | null = null;

  constructor(
    adapter: TokenAdapter,
    emitter: AuthEventEmitter,
    stateMachine: AuthStateMachine,
    refreshFn?: RefreshFunction,
  ) {
    this.adapter = adapter;
    this.emitter = emitter;
    this.stateMachine = stateMachine;
    this.refreshFn = refreshFn;
  }

  /** Get current access token, or null if not set */
  getAccessToken(): string | null {
    return this.adapter.getAccessToken();
  }

  /** Get current refresh token, or null if not set */
  getRefreshToken(): string | null {
    return this.adapter.getRefreshToken();
  }

  /** Check if current token is expired */
  isExpired(): boolean {
    return isTokenExpired(this.adapter.getExpiresAt());
  }

  /** Store tokens from an auth response */
  setTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }): void {
    this.adapter.setAccessToken(tokens.accessToken);
    if (tokens.refreshToken) {
      this.adapter.setRefreshToken(tokens.refreshToken);
    }
    this.adapter.setExpiresAt(tokens.expiresAt);
  }

  /** Clear all stored tokens */
  clearTokens(): void {
    this.adapter.clear();
  }

  /**
   * Attempt to silently refresh the access token.
   *
   * Uses a single-promise lock: if a refresh is already in progress,
   * subsequent calls will await the same promise instead of making
   * duplicate refresh requests.
   *
   * @throws TokenRefreshError if refresh fails
   * @throws TokenExpiredError if no refresh token is available
   */
  async refresh(): Promise<AuthResponse> {
    // Return existing refresh promise if one is in progress (single lock)
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.adapter.getRefreshToken();
    if (!refreshToken) {
      throw new TokenExpiredError('No refresh token available');
    }

    if (!this.refreshFn) {
      throw new TokenRefreshError('No refresh function configured');
    }

    this.stateMachine.transition('refreshing');

    this.refreshPromise = this._doRefresh(refreshToken);

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await this.refreshFn!(refreshToken);

      this.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
      });

      this.stateMachine.transition('authenticated');

      this.emitter.emit('refresh', {
        accessToken: response.accessToken,
        expiresAt: response.expiresAt,
      });

      return response;
    } catch (err) {
      this.stateMachine.transition('error');
      this.emitter.emit('error', {
        error: err instanceof Error ? err : new TokenRefreshError(),
      });
      throw new TokenRefreshError(
        err instanceof Error ? err.message : 'Failed to refresh token',
      );
    }
  }

  /** Set or update the refresh function */
  setRefreshFunction(fn: RefreshFunction): void {
    this.refreshFn = fn;
  }
}
