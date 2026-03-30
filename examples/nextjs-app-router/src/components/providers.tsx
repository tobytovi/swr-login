'use client';

import { createAuthConfig } from '@/lib/auth-config';
import { SWRLoginProvider } from '@swr-login/react';
import { useMemo } from 'react';

/**
 * Client-side providers wrapper.
 * SWRLoginProvider must be a Client Component because it uses React context, hooks, and browser APIs.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => createAuthConfig(), []);

  return <SWRLoginProvider config={config}>{children}</SWRLoginProvider>;
}
