/**
 * @swr-login/core - Event bus (v0.9).
 *
 * Replaces v0.7's `AuthEventEmitter`. Differences:
 *   - Single envelope type `AuthEvent` (kind-discriminated), not multi-map
 *   - `subscribe(kind | kind[], handler)` supports kind arrays
 *   - `timestamp` auto-injected when omitted
 *   - Re-entrant safe: subscribers iterated over a snapshot
 */

import type { AuthEvent, AuthEventKind } from './types';

type Handler = (event: AuthEvent) => void;

export class EventBus {
  private handlers = new Set<{ kinds: ReadonlySet<AuthEventKind> | null; fn: Handler }>();

  /**
   * Subscribe to one kind, multiple kinds, or all events (when `kind` is omitted).
   * @returns unsubscribe function
   */
  subscribe(kind: AuthEventKind | AuthEventKind[] | undefined, fn: Handler): () => void {
    const kinds =
      kind === undefined ? null : new Set<AuthEventKind>(Array.isArray(kind) ? kind : [kind]);
    const entry = { kinds, fn };
    this.handlers.add(entry);
    return () => {
      this.handlers.delete(entry);
    };
  }

  /**
   * Publish an event. `timestamp` is auto-injected when missing.
   * Subscriber errors are caught and logged, never propagated.
   */
  publish(event: Omit<AuthEvent, 'timestamp'> & Partial<Pick<AuthEvent, 'timestamp'>>): void {
    const enriched: AuthEvent = {
      ...event,
      timestamp: event.timestamp ?? Date.now(),
    };
    // Snapshot to allow handlers to (un)subscribe during iteration
    const snapshot = Array.from(this.handlers);
    for (const { kinds, fn } of snapshot) {
      if (kinds && !kinds.has(enriched.kind)) continue;
      try {
        fn(enriched);
      } catch (err) {
        console.error('[swr-login] error in event handler:', err);
      }
    }
  }

  /** Drop every subscriber. */
  clear(): void {
    this.handlers.clear();
  }
}
