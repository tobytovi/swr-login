# Introduction

**swr-login** is a React authentication state management library with a **Plugin-as-Hook** architecture.

In v0.9, every login method is a React Hook. The library ships zero dependencies beyond React 18.

## Why Plugin-as-Hook?

Traditional auth libraries provide a static plugin registry that runs outside React. This causes:

- Hook order violations when methods are toggled at runtime
- Difficult type inference for method-specific fields
- Hard-coded multi-step flow coordination

swr-login v0.9 solves all three:

```ts
// Every method is a Hook-returning object
const handle = useLoginMethod<typeof passwordMethod>('swr-login/password');
// ↑ TypeScript infers the full PasswordHandle shape automatically
```

## Core Concepts

| Concept | Description |
|---|---|
| **LoginMethod** | An object with `id`, `meta`, and `use()` (a React Hook) |
| **AuthHookRegistry** | The top-level provider; mounts all methods and manages session state |
| **MethodSlot** | Internal component that calls `method.use()` — ensures stable Hook order |
| **Credential** | Pluggable storage adapter (JWT / Cookie / Session) |
| **SessionStore** | `useSyncExternalStore`-based state — `loading \| authenticated \| unauthenticated` |
| **EventBus** | Internal pub/sub for `login \| logout \| session_lost \| session_refresh \| external` |
| **onRegistryMount** | Lifecycle hook called once at mount time — ideal for OAuth callback handling |

## Package Structure

```
swr-login/               # Unified entry (re-exports core + react)
swr-login/adapters/jwt   # JWT (localStorage) credential
swr-login/adapters/cookie
swr-login/adapters/session
swr-login/methods/password
swr-login/methods/mock   # Dev-only mock method
swr-login/methods/oauth-github
swr-login/methods/oauth-google
swr-login/methods/oauth-wechat
swr-login/methods/passkey
@swr-login/testing       # testLoginMethod() conformance suite
```
