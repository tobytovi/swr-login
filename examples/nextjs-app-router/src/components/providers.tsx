'use client';

import { createAuthSetup } from '@/lib/auth-config';
import { useMemo } from 'react';
import { AuthHookRegistry } from 'swr-login';

/**
 * Client-side providers wrapper.
 * AuthHookRegistry must be a Client Component because it uses React context,
 * hooks, and browser APIs (localStorage, BroadcastChannel, WebAuthn).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const setup = useMemo(() => createAuthSetup(), []);

  return (
    <AuthHookRegistry
      credential={setup.credential}
      methods={setup.methods}
      fetchSession={setup.fetchSession}
      onSessionChange={setup.onSessionChange}
      security={setup.security}
    >
      {children}
    </AuthHookRegistry>
  );
}
