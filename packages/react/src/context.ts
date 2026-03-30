import type {
  AuthEventEmitter,
  AuthStateMachine,
  BroadcastSync,
  PluginManager,
  SWRLoginConfig,
  TokenManager,
} from '@swr-login/core';
import { createContext, useContext } from 'react';

/** Internal context value passed through SWRLoginProvider */
export interface AuthContextValue {
  pluginManager: PluginManager;
  tokenManager: TokenManager;
  emitter: AuthEventEmitter;
  stateMachine: AuthStateMachine;
  broadcastSync: BroadcastSync | null;
  config: SWRLoginConfig;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Internal hook to access auth context.
 * Must be used within SWRLoginProvider.
 * @throws Error if used outside of SWRLoginProvider
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      '[swr-login] useAuthContext must be used within <SWRLoginProvider>. ' +
        'Wrap your app with <SWRLoginProvider> to use swr-login hooks.',
    );
  }
  return ctx;
}
