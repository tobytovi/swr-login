# Migration Guide: swr-login v0.7 → v0.9

> **v0.9.0-alpha.0** is a pre-release for the upcoming v1.0.0 GA.
> The API is stable within the 0.9.x series. Breaking changes from v0.7 are intentional and documented below.

## Quick Decision

If you're using swr-login in production, wait for v0.9.0-beta before migrating.
If you're starting a new project, start with v0.9.

---

## What Changed (Overview)

| Area | v0.7 | v0.9 |
|---|---|---|
| **Architecture** | Plugin registry (outside React) | Plugin-as-Hook (inside React) |
| **Provider** | `<SWRLoginProvider config={...}>` | `<AuthHookRegistry credential methods fetchSession>` |
| **Plugin interface** | `SWRLoginPlugin` (async object) | `LoginMethod<TInput,TResult,THandle>` (Hook-returning) |
| **Storage adapter** | `TokenAdapter` | `Credential` (+ `subscribe`, `onExpire`) |
| **Session state** | SWR key `AUTH_KEY` | `useSyncExternalStore` (no SWR dep) |
| **Login hook** | `useLogin(pluginId)` | `useLoginMethod<M>(id)` → typed Handle |
| **User hook** | `useUser()` | `useSession<TUser>()` |
| **Event hook** | `useUserChange(handler)` | `useSessionEvent(handler)` |
| **Adapter hook** | `useAdapter()` | `useCredential()` |
| **Sub-path imports** | `swr-login/plugins/password` | `swr-login/methods/password` |

---

## Step-by-Step Migration

### Step 1: Update packages

```sh
# Remove v0.7 packages
npm uninstall swr @swr-login/plugin-password @swr-login/plugin-oauth-github \
  @swr-login/plugin-oauth-google @swr-login/plugin-oauth-wechat @swr-login/plugin-passkey

# Install v0.9
npm install swr-login@^0.9.0-alpha.0
```

### Step 2: Migrate the Provider

```tsx
// BEFORE (v0.7)
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';
import { SWRLoginProvider } from '@swr-login/react';

<SWRLoginProvider config={{
  adapter: JWTAdapter({ storage: 'localStorage' }),
  plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
  fetchUser: async ({ token }) => fetchUser(token),
  onLogin: (user) => console.log('logged in', user),
}}>

// AFTER (v0.9)
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createPasswordMethod } from 'swr-login/methods/password';
import { AuthHookRegistry } from 'swr-login';

const credential = createJWTCredential({ storage: 'localStorage' });
const passwordMethod = createPasswordMethod({ loginUrl: '/api/login' });

<AuthHookRegistry
  credential={credential}
  methods={[passwordMethod]}
  fetchSession={async ({ accessToken }) => fetchUser(accessToken)}
  onSessionChange={(e) => { if (e.kind === 'login') console.log('logged in', e.user) }}
>
```

### Step 3: Migrate login hooks

```tsx
// BEFORE (v0.7)
const { login, isLoading, error } = useLogin('password');
const handleSubmit = () => login({ username, password });

// AFTER (v0.9)
import type { PasswordHandle } from 'swr-login/methods/password';
const handle = useLoginMethod<typeof passwordMethod>('swr-login/password') as PasswordHandle;
const handleSubmit = () => handle.submit?.({ username, password });
// isLoading → handle.state === 'pending'
// error → handle.error
```

### Step 4: Migrate user/session hooks

```tsx
// BEFORE (v0.7)
const { user, isAuthenticated, isLoading } = useUser();

// AFTER (v0.9)
const { user, status } = useSession<MyUser>();
// isLoading   → status === 'loading'
// isAuthenticated → status === 'authenticated'
```

### Step 5: Migrate event hooks

```tsx
// BEFORE (v0.7)
useUserChange((source, user, prevUser) => { ... });

// AFTER (v0.9)
useSessionEvent((event) => {
  // event.kind: 'login' | 'logout' | 'session_lost' | 'session_refresh' | 'external'
  // event.user, event.previousUser, event.methodId, event.timestamp
});
```

### Step 6: Replace AUTH_KEY

```tsx
// BEFORE (v0.7) — manually mutating SWR cache
import { AUTH_KEY } from '@swr-login/react';
import { mutate } from 'swr';
mutate(AUTH_KEY, newUser);

// AFTER (v0.9) — trigger refresh via credential subscription
// The credential's subscribe() listener fires sessionStore.refresh() automatically.
// For explicit refresh inside a method:
const { refreshSession } = useAuthInternal();
await refreshSession();
```

---

## Adapter Migration

```tsx
// BEFORE (v0.7) — TokenAdapter interface
interface TokenAdapter {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
}

// AFTER (v0.9) — Credential interface
interface Credential {
  readonly version: '1.0';
  hasAuth(): boolean;
  clear(): Promise<void>;
  getAccessToken?(): string | null;
  subscribe(listener: () => void): () => void;
  onExpire?: () => void;  // Set by AuthHookRegistry; call in 401 interceptors
}
```

If you have a custom adapter, implement the `Credential` interface.

---

## Codemod (coming in v0.9.0-beta)

A codemod will be provided to automate the most common transformations:

```sh
npx @swr-login/codemod@beta ./src
```

The codemod will transform:
- `SWRLoginProvider` → `AuthHookRegistry`
- `useLogin` → `useLoginMethod`
- `useUser` → `useSession`
- `useUserChange` → `useSessionEvent`
- `useAdapter` → `useCredential`

Manual review is still required for config migration and custom plugins.

---

## Need Help?

- [GitHub Discussions](https://github.com/tobytovi/swr-login/discussions)
- [Full API Reference](https://swr-login.dev/api/)
- [v0.9 Examples](https://github.com/tobytovi/swr-login/tree/main/examples)
