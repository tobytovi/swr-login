# Quick Start

Get a password-based login flow running in 5 minutes.

## 1. Install

```sh
npm install swr-login
```

## 2. Configure credential and methods

```ts
// lib/auth.ts
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createPasswordMethod } from 'swr-login/methods/password';

export const credential = createJWTCredential({ storage: 'localStorage' });

export const passwordMethod = createPasswordMethod({
  loginUrl: '/api/auth/login',
  slot: 'primary',
});

export const METHODS = [passwordMethod];

export async function fetchSession(token: { accessToken: string | null }) {
  if (!token.accessToken) return null;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  return res.ok ? res.json() : null;
}
```

## 3. Wrap your app

```tsx
// App.tsx (or layout.tsx in Next.js)
import { AuthHookRegistry } from 'swr-login';
import { credential, METHODS, fetchSession } from './lib/auth';

export default function App({ children }) {
  return (
    <AuthHookRegistry
      credential={credential}
      methods={METHODS}
      fetchSession={fetchSession}
      security={{ enableBroadcastSync: true }}
    >
      {children}
    </AuthHookRegistry>
  );
}
```

## 4. Build your login form

```tsx
import { useLoginMethod, useSession } from 'swr-login';
import type { passwordMethod } from './lib/auth';
import type { PasswordHandle } from 'swr-login/methods/password';

export function LoginPage() {
  const handle = useLoginMethod<typeof passwordMethod>('swr-login/password') as PasswordHandle;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await handle.submit({ username, password });
    }}>
      <input value={username} onChange={e => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {handle.error && <p>{handle.error.message}</p>}
      <button disabled={handle.state === 'pending'}>
        {handle.state === 'pending' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

## 5. Protect routes with AuthGuard

```tsx
import { AuthGuard } from 'swr-login';

<AuthGuard fallback={<LoginPage />}>
  <Dashboard />
</AuthGuard>
```

That's it! See [Concepts](/concepts/) and [API Reference](/api/) for the full picture.
