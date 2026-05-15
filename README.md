<div align="center">

# swr-login

**Plugin-as-Hook React Authentication State Management.**

Every login method is a React Hook. Zero external state dependencies.

[![npm](https://img.shields.io/npm/v/swr-login?color=blue)](https://www.npmjs.com/package/swr-login)
[![bundle size](https://img.shields.io/bundlephobia/minzip/swr-login?label=size)](https://bundlephobia.com/package/swr-login)
[![license](https://img.shields.io/github/license/tobytovi/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

**v0.9.0-alpha.0** — Pre-release for v1.0 GA. [Migration from v0.7 →](./MIGRATION.md)

[English](#features) · [中文](./README.zh-CN.md) · [Docs](https://swr-login.dev)

</div>

---

## Features

- **Plugin-as-Hook** — Every auth method is a React Hook. Type-safe handle inference, unlimited extensibility.
- **Zero External State** — `useSyncExternalStore` replaces SWR. No SWR peer dependency.
- **Stable Hook Order** — `MethodSlotList` ensures Hook call order is always stable across re-renders.
- **`onRegistryMount`** — Async lifecycle hook for OAuth callbacks, Passkey setup, and other mount-time side effects.
- **Multi-tab Sync** — `BroadcastSync` keeps session state consistent across browser tabs.
- **100% TypeScript** — Three-generic `LoginMethod<TInput, TResult, THandle>` infers custom handle fields.
- **Conformance Test Suite** — `@swr-login/testing` validates any custom method via `testLoginMethod()`.

## Installation

```sh
npm install swr-login
# or
pnpm add swr-login
```

## Quick Start

```tsx
import { AuthHookRegistry, useSession, useLoginMethod, useLogout, AuthGuard } from 'swr-login';
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createPasswordMethod } from 'swr-login/methods/password';
import type { PasswordHandle } from 'swr-login/methods/password';

// 1. Configure credential and methods (outside component — stable references)
const credential = createJWTCredential({ storage: 'localStorage' });
const passwordMethod = createPasswordMethod({ loginUrl: '/api/auth/login' });
const METHODS = [passwordMethod];

async function fetchSession(token: { accessToken: string | null }) {
  if (!token.accessToken) return null;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  return res.ok ? res.json() : null;
}

// 2. Wrap your app
function App() {
  return (
    <AuthHookRegistry
      credential={credential}
      methods={METHODS}
      fetchSession={fetchSession}
      security={{ enableBroadcastSync: true }}
    >
      <AppContent />
    </AuthHookRegistry>
  );
}

// 3. Build your login form — type-safe handle inference
function LoginForm() {
  const handle = useLoginMethod<typeof passwordMethod>('swr-login/password') as PasswordHandle;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await handle.submit({ username, password });
    }}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {handle.error && <p style={{ color: 'red' }}>{handle.error.message}</p>}
      <button disabled={handle.state === 'pending'}>
        {handle.state === 'pending' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

// 4. Check session state
function AppContent() {
  const { status } = useSession();
  if (status === 'loading') return <Spinner />;
  return (
    <AuthGuard fallback={<LoginForm />}>
      <Dashboard />
    </AuthGuard>
  );
}
```

## Official Methods

| Package | Sub-path | Description |
|---|---|---|
| (built-in) | `swr-login/methods/password` | Username + password |
| (built-in) | `swr-login/methods/mock` | Dev-only mock login |
| (built-in) | `swr-login/methods/oauth-github` | GitHub OAuth + PKCE |
| (built-in) | `swr-login/methods/oauth-google` | Google OAuth + PKCE |
| (built-in) | `swr-login/methods/oauth-wechat` | WeChat OAuth (H5 redirect) |
| (built-in) | `swr-login/methods/passkey` | WebAuthn Passkey |

## Official Adapters

| Sub-path | Description |
|---|---|
| `swr-login/adapters/jwt` | localStorage JWT tokens |
| `swr-login/adapters/cookie` | HTTP-only cookie session |
| `swr-login/adapters/session` | sessionStorage tokens |

## Building Custom Methods

```ts
import { defineLoginMethod, useAuthInternal, LoginRejection } from 'swr-login';

export const myMethod = defineLoginMethod<MyInput, MyResult, MyHandle>({
  id: 'acme/sso',  // scope/name required
  meta: { label: 'Acme SSO', slot: 'primary' },
  use() {
    const { refreshSession, publishEvent } = useAuthInternal();
    // ... return handle
  },
  // Optional: run at mount time (OAuth callbacks, Passkey setup, etc.)
  async onRegistryMount(internal) {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      await exchangeCode(code, internal.registrySignal);
      await internal.refreshSession();
    }
    return () => { /* cleanup on unmount */ };
  },
});
```

## Testing Methods

```ts
import { testLoginMethod, createMockCredential } from '@swr-login/testing';

testLoginMethod(myMethod, {
  mockCredential: createMockCredential(),
  testSubmit: async (handle) => {
    await handle.submit!({ token: 'mock' });
    expect(handle.state).toBe('success');
  },
});
```

## Migration from v0.7

See [MIGRATION.md](./MIGRATION.md) for a complete v0.7 → v0.9 guide.

```tsx
// v0.7
<SWRLoginProvider config={{ adapter: ..., plugins: [...], fetchUser: ... }}>

// v0.9
<AuthHookRegistry credential={...} methods={[...]} fetchSession={...}>
```

## License

MIT © swr-login Contributors
