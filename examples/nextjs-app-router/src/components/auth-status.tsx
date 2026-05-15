'use client';

import type { User } from '@/lib/auth-config';
import { useSession } from 'swr-login';

/**
 * Lightweight auth status indicator for the navbar.
 * Demonstrates useSession() for conditional rendering without page reload.
 */
export function AuthStatus() {
  const { user, status } = useSession<User>();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        Checking...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        Not signed in
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-700">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      {user?.name ?? user?.email ?? 'Signed in'}
    </div>
  );
}
