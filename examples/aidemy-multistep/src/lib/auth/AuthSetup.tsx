'use client';

/**
 * AuthSetup — wraps the app with AuthHookRegistry (RFC §8.4).
 *
 * Uses cookie credential (session-based auth, no localStorage needed).
 * Both password and class-code methods are registered here.
 */

import { useMemo } from 'react';
import { AuthHookRegistry } from 'swr-login';
import type { SessionChangeEvent } from 'swr-login';
import { createCookieCredential } from 'swr-login/adapters/cookie';
import { fetchUserSession } from './identity';
import { classCodeMethod, passwordMethod } from './methods';

// Credential is stable — created outside the component to avoid recreation.
const credential = createCookieCredential();

// Methods array is stable — defined outside component.
const METHODS = [passwordMethod, classCodeMethod];

async function handleSessionChange(e: SessionChangeEvent) {
  if (e.kind === 'login') {
    // In production: call analytics.track or server-side audit log
    console.log('[aidemy] login_success', { methodId: e.methodId, timestamp: e.timestamp });
  }
}

export default function AuthSetup({ children }: { children: React.ReactNode }) {
  // fetchSession is stable (module-level function), but wrap in useMemo for clarity.
  const methods = useMemo(() => METHODS, []);

  return (
    <AuthHookRegistry
      credential={credential}
      methods={methods}
      fetchSession={fetchUserSession}
      onSessionChange={handleSessionChange}
      security={{ enableBroadcastSync: true }}
    >
      {children}
    </AuthHookRegistry>
  );
}
