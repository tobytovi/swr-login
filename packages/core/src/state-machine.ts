import type { AuthEventEmitter } from './event-emitter';
import type { AuthState } from './types';

/** Valid state transitions map */
const VALID_TRANSITIONS: Record<AuthState, AuthState[]> = {
  idle: ['authenticating', 'authenticated', 'unauthenticated'],
  authenticating: ['authenticated', 'error', 'unauthenticated'],
  authenticated: ['refreshing', 'unauthenticated', 'error'],
  refreshing: ['authenticated', 'unauthenticated', 'error'],
  unauthenticated: ['authenticating', 'idle'],
  error: ['authenticating', 'unauthenticated', 'idle'],
};

/**
 * Authentication state machine.
 * Manages transitions between auth states and emits state-change events.
 *
 * State flow:
 * ```
 * idle -> authenticating -> authenticated -> refreshing -> authenticated
 *                       \-> error                      \-> unauthenticated
 * ```
 */
export class AuthStateMachine {
  private _state: AuthState = 'idle';
  private emitter: AuthEventEmitter;

  constructor(emitter: AuthEventEmitter, initialState: AuthState = 'idle') {
    this.emitter = emitter;
    this._state = initialState;
  }

  /** Current authentication state */
  get state(): AuthState {
    return this._state;
  }

  /**
   * Transition to a new state.
   * @throws Error if the transition is not valid
   */
  transition(to: AuthState): void {
    const from = this._state;

    if (from === to) return;

    const validTargets = VALID_TRANSITIONS[from];
    if (!validTargets.includes(to)) {
      console.warn(`[swr-login] Invalid state transition: ${from} -> ${to}`);
      return;
    }

    this._state = to;
    this.emitter.emit('state-change', {
      from,
      to,
      timestamp: Date.now(),
    });
  }

  /** Reset state machine to idle */
  reset(): void {
    this._state = 'idle';
  }
}
