/**
 * @swr-login/react - useSessionEvent (v0.9).
 *
 * Subscribe to auth events from anywhere in the component tree. Common uses:
 *   - cross-page redirects on logout / session_lost
 *   - account-binding side effects when a particular method logs in
 *
 * Stability: handler is wrapped in a ref so passing inline functions does NOT
 * cause repeated subscribe/unsubscribe cycles.
 */

import type { AuthEventKind, SessionChangeEvent } from '@swr-login/core';
import { useEffect, useRef } from 'react';
import { useAuthRegistryContext } from '../context';

export type SessionEventHandler = (event: SessionChangeEvent) => void | Promise<void>;

export function useSessionEvent(
  kind: AuthEventKind | AuthEventKind[],
  handler: SessionEventHandler,
): void {
  const { eventBus, sessionStore } = useAuthRegistryContext();

  // Wrap both handler and kind in refs so the effect never needs to re-run
  // due to reference changes — only eventBus/sessionStore (stable singletons) matter.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const kindRef = useRef(kind);
  kindRef.current = kind;

  useEffect(() => {
    // Read kind from ref at subscribe time — stays up-to-date without re-subscribing.
    const off = eventBus.subscribe(kindRef.current, (event) => {
      const snap = sessionStore.getSnapshot();
      const sce: SessionChangeEvent = {
        kind: event.kind,
        user: snap.user,
        previousUser: snap.user,
        methodId: event.methodId,
        timestamp: event.timestamp,
      };
      const result = handlerRef.current(sce);
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error('[swr-login] error in useSessionEvent handler:', err);
        });
      }
    });
    return off;
    // eventBus and sessionStore are stable singletons; refs (kindRef/handlerRef) auto-update without re-subscription.
  }, [eventBus, sessionStore]);
}
