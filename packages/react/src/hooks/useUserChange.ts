import type { User, UserChangeEvent, UserChangeSource } from '@swr-login/core';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context';

/**
 * Subscribe to `user-change` events as a **discrete event stream**.
 *
 * Unlike `useUser().user` (which reflects the *current* user value), this
 * hook returns the most recent transition event and re-renders the caller
 * only when a new transition occurs. It's intended for `useEffect`-driven
 * side effects that care about *when* and *why* the user changed rather
 * than the current user value itself.
 *
 * Returns `null` until the first transition is observed by the Provider.
 *
 * @typeParam T - Concrete user type (defaults to base `User`)
 *
 * @example
 * ```tsx
 * const change = useUserChange<MyUser>();
 *
 * useEffect(() => {
 *   if (change?.source === 'login') {
 *     toast.success(`Welcome back, ${change.user?.name}!`);
 *   }
 * }, [change]);
 * ```
 *
 * @example Filter by source
 * ```tsx
 * const change = useUserChange();
 * useEffect(() => {
 *   if (change?.source === 'external') {
 *     // Another tab just logged in / out — refresh local UI
 *     refreshSidebar();
 *   }
 * }, [change]);
 * ```
 */
export function useUserChange<T extends User = User>(): UserChangeEvent<T> | null {
  const { emitter } = useAuthContext();
  const [event, setEvent] = useState<UserChangeEvent<T> | null>(null);

  useEffect(() => {
    const unsubscribe = emitter.on('user-change', (payload) => {
      setEvent(payload as UserChangeEvent<T>);
    });
    return unsubscribe;
  }, [emitter]);

  return event;
}

/**
 * Register a side-effect callback that fires on every `user-change` event,
 * **without** triggering a re-render of the calling component.
 *
 * Ideal for analytics / logging / imperative side effects that don't need
 * to participate in React's render cycle.
 *
 * The callback receives the full `UserChangeEvent` (including `previousUser`,
 * `timestamp`, and `source`). The listener is automatically unsubscribed on
 * unmount.
 *
 * Note: the callback reference is stored in a ref and always called with
 * the latest closure — you do NOT need to memoize it with `useCallback`.
 *
 * @example Analytics
 * ```tsx
 * useUserChangeEffect((e) => {
 *   if (e.source === 'login') {
 *     analytics.track('user_login', { userId: e.user?.id });
 *   }
 *   if (e.source === 'logout') {
 *     analytics.track('user_logout', { userId: e.previousUser?.id });
 *   }
 * });
 * ```
 *
 * @example Filter sources
 * ```tsx
 * useUserChangeEffect((e) => {
 *   // Only react to passive revalidations that flipped the user to null
 *   // (e.g. server returned 401 → session expired silently).
 *   if (e.source === 'revalidate' && e.user === null && e.previousUser) {
 *     showReLoginPrompt();
 *   }
 * });
 * ```
 */
export function useUserChangeEffect<T extends User = User>(
  listener: (event: UserChangeEvent<T>) => void,
): void {
  const { emitter } = useAuthContext();

  // Store latest callback in a ref so consumers don't need useCallback.
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const unsubscribe = emitter.on('user-change', (payload) => {
      try {
        listenerRef.current(payload as UserChangeEvent<T>);
      } catch (err) {
        console.error('[swr-login] Error in useUserChangeEffect listener:', err);
      }
    });
    return unsubscribe;
  }, [emitter]);
}

/**
 * Convenience hook: fires the callback only when the change source matches
 * the given filter. Thin wrapper around {@link useUserChangeEffect}.
 *
 * @example
 * ```tsx
 * // Only run on explicit login (not on cold-start initial load)
 * useUserChangeOn('login', (e) => router.push('/dashboard'));
 *
 * // Subscribe to multiple sources at once
 * useUserChangeOn(['login', 'external'], (e) => refreshSidebar());
 * ```
 */
export function useUserChangeOn<T extends User = User>(
  source: UserChangeSource | UserChangeSource[],
  listener: (event: UserChangeEvent<T>) => void,
): void {
  const sources = Array.isArray(source) ? source : [source];
  useUserChangeEffect<T>((event) => {
    if (sources.includes(event.source)) {
      listener(event);
    }
  });
}
