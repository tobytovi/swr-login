/**
 * @swr-login/react - AuthHookRegistry (v0.9).
 *
 * Replaces v0.7's `<SWRLoginProvider>`. Responsibilities:
 *   1. Build `MethodRegistry` from `methods` prop (with id-stability check).
 *   2. Construct the singletons: `SessionStore`, `EventBus`, `BroadcastSync`.
 *   3. Wire `Credential.subscribe` and broadcast events to refresh the session.
 *   4. Schedule `LoginMethod.onRegistryMount` (serial await, errors caught).
 *   5. Render `<MethodSlotList>` so `method.use()` is invoked for every method
 *      every render (stable Hook order).
 *   6. Bridge `onSessionChange` callback by diffing user transitions.
 */

import {
  type AuthEvent,
  type AuthHookRegistryProps,
  type AuthInternalContext,
  BroadcastSync,
  EventBus,
  type LoginMethod,
  type SessionSnapshot,
  SessionStore,
  buildMethodRegistry,
  checkIdSetStability,
} from '@swr-login/core';
import { useEffect, useMemo, useRef } from 'react';
import { MethodSlotList } from './components/MethodSlotList';
import {
  AuthInternalContextCtx,
  AuthRegistryContext,
  type AuthRegistryContextValue,
  type MethodCallDepthRef,
} from './context';
import { handlesChangeBus } from './hooks/useLoginMethod';

const isDev = (() => {
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return typeof proc !== 'undefined' && proc.env?.NODE_ENV !== 'production';
})();

/**
 * Top-level Provider for swr-login v0.9.
 *
 * @example
 * ```tsx
 * <AuthHookRegistry
 *   credential={cookieCredential}
 *   methods={[passwordMethod, githubMethod]}
 *   fetchSession={fetchUser}
 *   onSessionChange={async (e) => analytics.track(e)}
 *   security={{ enableBroadcastSync: true }}
 * >
 *   <App />
 * </AuthHookRegistry>
 * ```
 */
export function AuthHookRegistry({
  credential,
  methods,
  fetchSession,
  onSessionChange,
  security,
  children,
}: AuthHookRegistryProps) {
  // ─── Stable singletons ──────────────────────────────────
  const eventBus = useMemo(() => new EventBus(), []);

  const sessionStore = useMemo(
    () =>
      new SessionStore({
        fetchSession,
        getAccessToken: () => credential.getAccessToken?.() ?? null,
      }),
    // fetchSession / credential identity-stable expected; if they change, store is rebuilt.
    [fetchSession, credential],
  );

  const broadcast = useMemo(() => {
    if (security?.enableBroadcastSync === false) return null;
    if (typeof window === 'undefined') return null;
    return new BroadcastSync(security?.broadcastChannel);
  }, [security?.enableBroadcastSync, security?.broadcastChannel]);

  // Refs: handles map + abort controller + depth counter
  const handlesRef = useRef<Map<string, unknown>>(new Map());
  const registryAbortRef = useRef<AbortController | null>(null);
  const methodCallDepthRef = useRef<MethodCallDepthRef>({ current: 0 }).current;

  // ─── Method registry (cheap rebuild on methods change) ──
  const previousIdsRef = useRef<string[] | null>(null);
  const registry = useMemo(() => {
    const reg = buildMethodRegistry(methods);
    if (isDev) checkIdSetStability(previousIdsRef.current, reg.ids());
    previousIdsRef.current = reg.ids();
    return reg;
  }, [methods]);

  // ─── AuthInternalContext exposed to method authors ──────
  const authInternal = useMemo<AuthInternalContext>(() => {
    return {
      credential,
      refreshSession: async () => {
        await sessionStore.refresh();
        eventBus.publish({ kind: 'session_refresh' });
      },
      publishEvent: (event: AuthEvent) => {
        eventBus.publish(event);
        if (broadcast && shouldBroadcast(event.kind)) {
          broadcast.send({ ...event, timestamp: event.timestamp ?? Date.now() });
        }
      },
      get registrySignal() {
        if (!registryAbortRef.current) {
          registryAbortRef.current = new AbortController();
        }
        return registryAbortRef.current.signal;
      },
      createMethodAbort: () => new AbortController(),
    };
  }, [credential, sessionStore, eventBus, broadcast]);

  // ─── Hook up Credential.onExpire → session_lost ─────────
  useEffect(() => {
    credential.onExpire = () => {
      sessionStore.clear();
      eventBus.publish({ kind: 'session_lost' });
      if (broadcast) {
        broadcast.send({ kind: 'session_lost', timestamp: Date.now() });
      }
    };
    return () => {
      credential.onExpire = undefined;
    };
  }, [credential, sessionStore, eventBus, broadcast]);

  // ─── Subscribe to credential changes (cross-tab etc.) ───
  useEffect(() => {
    const unsubscribe = credential.subscribe(() => {
      sessionStore.refresh().catch((err) => {
        eventBus.publish({ kind: 'external', payload: err });
      });
    });
    return unsubscribe;
  }, [credential, sessionStore, eventBus]);

  // ─── Subscribe to broadcast events from other tabs ──────
  useEffect(() => {
    if (!broadcast) return;
    const unsubscribe = broadcast.subscribe((event) => {
      // Re-publish locally so useSessionEvent subscribers fire.
      eventBus.publish(event);
      // For lifecycle events, refresh local session.
      if (event.kind === 'login' || event.kind === 'session_refresh') {
        sessionStore.refresh().catch(() => {});
      } else if (event.kind === 'logout' || event.kind === 'session_lost') {
        sessionStore.clear();
      }
    });
    return () => {
      unsubscribe();
      broadcast.destroy();
    };
  }, [broadcast, eventBus, sessionStore]);

  // ─── Schedule onRegistryMount (serial, abort-aware) ─────
  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    if (!registryAbortRef.current) {
      registryAbortRef.current = new AbortController();
    }

    (async () => {
      for (const method of methods) {
        if (cancelled) return;
        if (!method.onRegistryMount) continue;
        try {
          const result = await method.onRegistryMount(authInternal);
          if (typeof result === 'function') cleanups.push(result);
        } catch (err) {
          eventBus.publish({ kind: 'external', methodId: method.id, payload: err });
        }
      }
      // Initial session probe after onRegistryMount chain finishes.
      if (!cancelled) {
        sessionStore.refresh().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
      registryAbortRef.current?.abort();
      registryAbortRef.current = null;
      // Reverse-order cleanup
      for (let i = cleanups.length - 1; i >= 0; i--) {
        try {
          cleanups[i]();
        } catch (err) {
          console.error('[swr-login] onRegistryMount cleanup error:', err);
        }
      }
    };
    // We intentionally rerun when `methods` reference changes; id-set stability
    // is enforced by buildMethodRegistry above.
  }, [methods, authInternal, eventBus, sessionStore]);

  // ─── Bridge onSessionChange (diff user transitions) ─────
  useEffect(() => {
    if (!onSessionChange) return;
    let prev: SessionSnapshot = sessionStore.getSnapshot();

    // 1) Diff session-store mutations into user transitions
    const offStore = sessionStore.subscribe(() => {
      const next = sessionStore.getSnapshot();
      if (next.user !== prev.user) {
        const kind = next.user ? 'login' : 'logout';
        const result = onSessionChange({
          kind,
          user: next.user,
          previousUser: prev.user,
          timestamp: Date.now(),
        });
        if (result instanceof Promise) {
          result.catch((err) => {
            eventBus.publish({ kind: 'external', payload: err });
          });
        }
        prev = next;
      } else {
        prev = next;
      }
    });

    // 2) Forward session_lost / external as full SessionChangeEvent
    const offBus = eventBus.subscribe(['session_lost', 'session_refresh', 'external'], (event) => {
      const snap = sessionStore.getSnapshot();
      const result = onSessionChange({
        kind: event.kind,
        user: snap.user,
        previousUser: prev.user,
        methodId: event.methodId,
        timestamp: event.timestamp,
      });
      if (result instanceof Promise) {
        result.catch((err) => {
          eventBus.publish({ kind: 'external', payload: err });
        });
      }
    });

    return () => {
      offStore();
      offBus();
    };
  }, [onSessionChange, sessionStore, eventBus]);

  // ─── clearOnHidden security option ──────────────────────
  useEffect(() => {
    if (!security?.clearOnHidden || typeof document === 'undefined') return;
    const handler = () => {
      if (document.hidden) {
        credential.clear().catch(() => {});
        sessionStore.clear();
        eventBus.publish({ kind: 'logout' });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, [security?.clearOnHidden, credential, sessionStore, eventBus]);

  // ─── Build registry context value ───────────────────────
  const registryContextValue = useMemo<AuthRegistryContextValue>(
    () => ({
      registry,
      credential,
      sessionStore,
      eventBus,
      security,
      methodCallDepthRef,
      handlesRef,
      registryAbortRef,
    }),
    [registry, credential, sessionStore, eventBus, security, methodCallDepthRef],
  );

  // Render order: AuthInternalContext is INNER so MethodSlot.use() receives
  // an existing AuthInternalContext.
  return (
    <AuthRegistryContext.Provider value={registryContextValue}>
      <AuthInternalContextCtx.Provider value={authInternal}>
        <MethodSlotList methods={methods} onHandlesChange={() => handlesChangeBus.notify()} />
        {children}
      </AuthInternalContextCtx.Provider>
    </AuthRegistryContext.Provider>
  );
}

/** @deprecated Use `AuthHookRegistry`. Kept as a transitional re-export. */
export { AuthHookRegistry as SWRLoginProvider };
export type AuthHookRegistryPropsAlias = AuthHookRegistryProps;

function shouldBroadcast(kind: AuthEvent['kind']): boolean {
  return kind === 'login' || kind === 'logout' || kind === 'session_refresh';
}

// re-export type for d.ts
export type { LoginMethod };
