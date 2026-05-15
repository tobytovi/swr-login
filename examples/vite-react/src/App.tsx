/**
 * swr-login v0.9 — Vite + React Example
 *
 * Demonstrates:
 *   - AuthHookRegistry with password + mock methods
 *   - useSession, useLoginMethod<M>, useLogout
 *   - AuthGuard for route protection
 *   - useSessionEvent for event tracking
 */

import {
  AuthGuard,
  AuthHookRegistry,
  useLoginMethod,
  useLogout,
  useSession,
  useSessionEvent,
} from '@swr-login/react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createMockMethod } from 'swr-login/methods/mock';
import { createPasswordMethod } from 'swr-login/methods/password';
import type { PasswordHandle } from 'swr-login/methods/password';

// ─── Credential & Methods ──────────────────────────────────────

const credential = createJWTCredential({ storage: 'localStorage' });

const passwordMethod = createPasswordMethod({
  loginUrl: '/api/auth/login',
  label: 'Username & Password',
  slot: 'primary',
});

const mockMethod = createMockMethod({
  user: { id: 'mock-1', name: 'Demo User', email: 'demo@example.com', roles: ['user'] },
  delay: 800,
  label: 'Mock Login (dev)',
  slot: 'primary',
});

const METHODS = [passwordMethod, mockMethod];

async function fetchSession(token: { accessToken: string | null }) {
  if (!token.accessToken) return null;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; name: string; email: string; roles?: string[] }>;
}

// ─── Login Page ────────────────────────────────────────────────

function PasswordLoginForm() {
  const handle = useLoginMethod<typeof passwordMethod>('swr-login/password') as
    | PasswordHandle
    | undefined;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!handle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handle.submit({ username, password });
    } catch {
      // error is available at handle.error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          required
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          required
        />
      </div>

      {handle.error && <p style={{ color: 'red', marginBottom: 8 }}>{handle.error.message}</p>}

      <button
        type="submit"
        disabled={handle.state === 'pending'}
        style={{ width: '100%', padding: 10 }}
      >
        {handle.state === 'pending' ? 'Signing in...' : 'Sign in with Password'}
      </button>
    </form>
  );
}

function MockLoginButton() {
  const handle = useLoginMethod<typeof mockMethod>('local/mock');
  if (!handle) return null;

  return (
    <button
      type="button"
      onClick={() => handle.submit?.({})}
      disabled={handle.state === 'pending'}
      style={{
        width: '100%',
        padding: 10,
        marginTop: 8,
        background: '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {handle.state === 'pending' ? 'Loading...' : '✨ Mock Login (dev only)'}
    </button>
  );
}

function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>swr-login v0.9 Demo</h1>
      <PasswordLoginForm />
      <MockLoginButton />
    </div>
  );
}

// ─── Dashboard (protected) ─────────────────────────────────────

type User = { id?: string; name?: string; email?: string; roles?: string[] };

function Dashboard() {
  const { user } = useSession<User>();
  const { logout, isPending } = useLogout();

  useSessionEvent((event) => {
    if (event.kind === 'logout') {
      console.log('[demo] signed out');
    }
  });

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Dashboard</h1>
      <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <p>
          <strong>Name:</strong> {user?.name ?? 'N/A'}
        </p>
        <p>
          <strong>Email:</strong> {user?.email ?? 'N/A'}
        </p>
        <p>
          <strong>ID:</strong> {user?.id ?? 'N/A'}
        </p>
      </div>

      <AuthGuard
        roles={['admin']}
        fallback={<p style={{ color: '#999' }}>Admin panel requires admin role.</p>}
      >
        <div style={{ padding: 16, background: '#fff3cd', borderRadius: 8, marginTop: 16 }}>
          <h3>Admin Panel</h3>
          <p>You have admin access!</p>
        </div>
      </AuthGuard>

      <button
        type="button"
        onClick={() => logout()}
        disabled={isPending}
        style={{ marginTop: 16, padding: '10px 24px', cursor: 'pointer' }}
      >
        {isPending ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────

function AppContent() {
  const { status } = useSession();

  if (status === 'loading') {
    return <div style={{ textAlign: 'center', marginTop: 100 }}>Loading...</div>;
  }

  return status === 'authenticated' ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  const methods = useMemo(() => METHODS, []);

  return (
    <AuthHookRegistry
      credential={credential}
      methods={methods}
      fetchSession={fetchSession}
      onSessionChange={(e) => console.log('[swr-login]', e.kind, e.user)}
      security={{ enableBroadcastSync: true }}
    >
      <AppContent />
    </AuthHookRegistry>
  );
}
