import {
  AuthEventEmitter,
  AuthStateMachine,
  BroadcastSync,
  PluginManager,
  type SWRLoginConfig,
  TokenManager,
} from '@swr-login/core';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { AuthContext, type AuthContextValue, type UserChangeHint } from './context';

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
    const broadcastSync = enableSync && typeof window !== 'undefined' ? new BroadcastSync() : null;

    // Mutable hint object shared with useUser() to label the next user-change
    // event with its causal source (login/logout/external).
    const userChangeHint: UserChangeHint = { source: null, timestamp: 0 };
    const markHint = (source: UserChangeHint['source']) => {
      userChangeHint.source = source;
      userChangeHint.timestamp = Date.now();
    };

    // Label user-change source based on lifecycle events. The actual
    // 'user-change' event is emitted by useUser() once SWR produces a
    // different value; these hints only tell us *why* it's about to change.
    emitter.on('login', () => markHint('login'));
    emitter.on('logout', () => markHint('logout'));

    // Wire up lifecycle callbacks
    if (config.onLogin) {
      emitter.on('login', ({ user }) => config.onLogin?.(user));
    }
    if (config.onLogout) {
      emitter.on('logout', () => config.onLogout?.());
    }
    if (config.onError) {
      emitter.on('error', ({ error }) => config.onError?.(error));
    }

    return {
      pluginManager,
      tokenManager,
      emitter,
      stateMachine,
      broadcastSync,
      config,
      userChangeHint,
    };
  }, [config]);

  // Initialize plugins and broadcast sync on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const {
      pluginManager,
      broadcastSync,
      tokenManager,
      stateMachine,
      emitter,
      config: cfg,
    } = contextValue;

    // Initialize all plugins
    pluginManager.initializeAll().catch((err) => {
      console.error('[swr-login] Plugin initialization error:', err);
    });

    // Check if user has existing token -> restore session
    const existingToken = tokenManager.getAccessToken();
    const expiresAt = tokenManager.getExpiresAt();

    if (existingToken && !tokenManager.isExpired()) {
      stateMachine.transition('authenticated');
    } else if (existingToken && expiresAt === null) {
      // expiresAt 未知（如外部登录只设置了 token 但未设置过期时间）
      // 乐观地认为已认证，让 fetchUser / SWR revalidate 来验证
      stateMachine.transition('authenticated');
    } else if (existingToken && tokenManager.isExpired()) {
      stateMachine.transition('unauthenticated');
      emitter.emit('token-expired', undefined);
    }

    // Listen for cross-tab events
    if (broadcastSync) {
      const { userChangeHint } = contextValue;
      const markExternal = () => {
        userChangeHint.source = 'external';
        userChangeHint.timestamp = Date.now();
      };

      const unsubscribe = broadcastSync.onMessage((message) => {
        switch (message.type) {
          case 'LOGOUT':
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            emitter.emit('logout', undefined);
            // Emit-after-mark would be overwritten by the synchronous
            // 'logout' handler (which sets hint='logout'); re-mark to
            // 'external' so useUser labels this cross-tab logout correctly.
            markExternal();
            break;
          case 'LOGIN':
          case 'TOKEN_REFRESH':
            // Cross-tab login / refresh → refresh SWR cache; label the
            // upcoming user-change as 'external'.
            markExternal();
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
