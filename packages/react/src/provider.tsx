import React, { useEffect, useMemo, useRef } from 'react';
import {
  AuthEventEmitter,
  AuthStateMachine,
  BroadcastSync,
  PluginManager,
  TokenManager,
  type SWRLoginConfig,
} from '@swr-login/core';
import { AuthContext, type AuthContextValue } from './context';

export interface SWRLoginProviderProps {
  /** Authentication configuration */
  config: SWRLoginConfig;
  children: React.ReactNode;
}

/**
 * SWRLoginProvider initializes the auth system and provides context to all child hooks.
 *
 * @example
 * ```tsx
 * import { SWRLoginProvider } from '@swr-login/react';
 * import { JWTAdapter } from '@swr-login/adapter-jwt';
 * import { PasswordPlugin } from '@swr-login/plugin-password';
 *
 * function App() {
 *   return (
 *     <SWRLoginProvider
 *       config={{
 *         adapter: JWTAdapter(),
 *         plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
 *       }}
 *     >
 *       <YourApp />
 *     </SWRLoginProvider>
 *   );
 * }
 * ```
 */
export function SWRLoginProvider({ config, children }: SWRLoginProviderProps) {
  const initializedRef = useRef(false);

  const contextValue = useMemo<AuthContextValue>(() => {
    const emitter = new AuthEventEmitter();
    const stateMachine = new AuthStateMachine(emitter);
    const tokenManager = new TokenManager(config.adapter, emitter, stateMachine);
    const pluginManager = new PluginManager(tokenManager, emitter);

    // Register plugins
    pluginManager.register(...config.plugins);

    // Set up broadcast sync if enabled
    const enableSync = config.security?.enableBroadcastSync !== false;
    const broadcastSync =
      enableSync && typeof window !== 'undefined' ? new BroadcastSync() : null;

    // Wire up lifecycle callbacks
    if (config.onLogin) {
      emitter.on('login', ({ user }) => config.onLogin!(user));
    }
    if (config.onLogout) {
      emitter.on('logout', () => config.onLogout!());
    }
    if (config.onError) {
      emitter.on('error', ({ error }) => config.onError!(error));
    }

    return {
      pluginManager,
      tokenManager,
      emitter,
      stateMachine,
      broadcastSync,
      config,
    };
  }, [config]);

  // Initialize plugins and broadcast sync on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const { pluginManager, broadcastSync, tokenManager, stateMachine, emitter, config: cfg } =
      contextValue;

    // Initialize all plugins
    pluginManager.initializeAll().catch((err) => {
      console.error('[swr-login] Plugin initialization error:', err);
    });

    // Check if user has existing token -> restore session
    const existingToken = tokenManager.getAccessToken();
    if (existingToken && !tokenManager.isExpired()) {
      stateMachine.transition('authenticated');
    } else if (existingToken && tokenManager.isExpired()) {
      stateMachine.transition('unauthenticated');
      emitter.emit('token-expired', undefined);
    }

    // Listen for cross-tab events
    if (broadcastSync) {
      const unsubscribe = broadcastSync.onMessage((message) => {
        switch (message.type) {
          case 'LOGOUT':
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            emitter.emit('logout', undefined);
            break;
          case 'LOGIN':
          case 'TOKEN_REFRESH':
            // Trigger revalidation from other tab
            if (cfg.cacheAdapter) {
              cfg.cacheAdapter.revalidate();
            }
            break;
        }
      });

      return () => {
        unsubscribe();
        broadcastSync.destroy();
      };
    }
  }, [contextValue]);

  // Visibility change handler for security
  useEffect(() => {
    const { config: cfg, tokenManager, stateMachine, emitter } = contextValue;

    if (!cfg.security?.clearOnHidden || typeof document === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const delay = cfg.security?.clearOnHiddenDelay ?? 300_000;
        timeoutId = setTimeout(() => {
          tokenManager.clearTokens();
          stateMachine.transition('unauthenticated');
          emitter.emit('logout', undefined);
        }, delay);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [contextValue]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
