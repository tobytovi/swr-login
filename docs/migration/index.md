# Migration Guide: v0.7 → v0.9

This is a **breaking change**. v0.9 replaces the Plugin architecture with Plugin-as-Hook.

> See also: [MIGRATION.md](https://github.com/tobytovi/swr-login/blob/main/MIGRATION.md) in the repo root.

## Concept mapping

| v0.7 | v0.9 | Notes |
|---|---|---|
| `SWRLoginProvider` | `AuthHookRegistry` | Props completely changed |
| `SWRLoginConfig` | `AuthHookRegistryProps` | No more `adapter`, `plugins`, `fetchUser` top-level |
| `SWRLoginPlugin` | `LoginMethod<TInput,TResult,THandle>` | Three-generic, Hook-returning |
| `TokenAdapter` | `Credential` | New interface: `subscribe`, `onExpire`, `hasAuth` |
| `plugins: [PasswordPlugin({...})]` | `methods: [passwordMethod]` | Factory → instance |
| `useLogin('password')` | `useLoginMethod<typeof passwordMethod>('swr-login/password')` | Typed handle |
| `useUser()` | `useSession<TUser>()` | Returns `{ user, status }` |
| `useUserChange(handler)` | `useSessionEvent(handler)` | Ref-wrapped, stable subscription |
| `useAdapter()` | `useCredential()` | Returns `Credential` |
| `AUTH_KEY` | Not needed | See AUTH_KEY section below |
| `isLoading` on useUser | `status === 'loading'` on useSession | Status enum |
| `isAuthenticated` on useUser | `status === 'authenticated'` | Status enum |
| `@swr-login/plugin-password` | `@swr-login/method-password` | Renamed package |
| `swr-login/plugins/password` | `swr-login/methods/password` | Renamed sub-path |

## Provider migration

```tsx
// v0.7
<SWRLoginProvider config={{
  adapter: JWTAdapter({ storage: 'localStorage' }),
  plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
  fetchUser: async ({ token }) => fetch('/api/me', ...),
}}>

// v0.9
<AuthHookRegistry
  credential={createJWTCredential({ storage: 'localStorage' })}
  methods={[createPasswordMethod({ loginUrl: '/api/login' })]}
  fetchSession={async ({ accessToken }) => fetch('/api/me', ...)}
>
```

## Hook migration

```tsx
// v0.7
const { login, isLoading, error } = useLogin('password');
await login({ username, password });

// v0.9
const handle = useLoginMethod<typeof passwordMethod>('swr-login/password');
await handle.submit({ username, password });
// handle.state === 'pending' replaces isLoading
// handle.error replaces error
```

```tsx
// v0.7
const { user, isAuthenticated, isLoading } = useUser();

// v0.9
const { user, status } = useSession<MyUser>();
// status: 'loading' | 'authenticated' | 'unauthenticated'
```

## AUTH_KEY migration

In v0.7, you may have used SWR's `AUTH_KEY` constant to manually mutate auth state:

```ts
// v0.7 (anti-pattern to avoid)
import { AUTH_KEY } from '@swr-login/react';
mutate(AUTH_KEY, updatedUser);
```

In v0.9, the `SessionStore` is internal. To trigger a re-fetch:

```ts
// v0.9
const { refreshSession } = useAuthInternal(); // inside a method
// or
const { user } = useSession(); // useSession auto-refreshes when credential.subscribe() fires
```

For cross-component invalidation without a method context, call `credential.subscribe()`:
the listener fires whenever tokens change, which triggers `sessionStore.refresh()` automatically.

## Package rename

```sh
# Remove old packages
npm uninstall @swr-login/plugin-password @swr-login/plugin-oauth-github swr

# Install new packages
npm install swr-login@^0.9.0-alpha.0
```

## Import path changes

```ts
// v0.7
import { PasswordPlugin } from '@swr-login/plugin-password';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';

// v0.9
import { createPasswordMethod } from 'swr-login/methods/password';
import { createGitHubOAuthMethod } from 'swr-login/methods/oauth-github';
```
