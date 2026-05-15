/**
 * @swr-login/react - AuthGuard (v0.9).
 *
 * Declarative auth guard powered by `useSession`. Permission/role checks
 * are delegated to a user-supplied predicate to keep the core unopinionated
 * about user shape.
 */

import type React from 'react';
import { useSession } from '../hooks/useSession';

export interface AuthGuardProps<TUser = unknown> {
  children: React.ReactNode;
  /** Custom authorization check; receives `user` and returns `boolean`. */
  authorize?: (user: TUser) => boolean;
  /** Rendered when unauthenticated or `authorize` returns false. */
  fallback?: React.ReactNode;
  /** Rendered while the session is still loading. */
  loadingComponent?: React.ReactNode;
}

export function AuthGuard<TUser = unknown>({
  children,
  authorize,
  fallback = null,
  loadingComponent = null,
}: AuthGuardProps<TUser>) {
  const { user, status } = useSession<TUser>();

  if (status === 'loading') {
    return <>{loadingComponent}</>;
  }
  if (status !== 'authenticated' || user === null) {
    return <>{fallback}</>;
  }
  if (authorize && !authorize(user)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
