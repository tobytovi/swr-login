# API Reference

Complete public API for swr-login v0.9.

## Provider

### `<AuthHookRegistry>`

The root provider. Replaces v0.7 `<SWRLoginProvider>`.

```tsx
<AuthHookRegistry
  credential={credential}           // Credential v1.0 adapter
  methods={[passwordMethod, ...]}   // LoginMethod array (ID-set must be stable)
  fetchSession={fetchUser}          // Called after login/refresh
  onSessionChange={async (e) => {}} // Session change callback (sync or async)
  security={{
    enableBroadcastSync: true,      // Cross-tab sync
    clearOnHidden: false,           // Clear session on tab hide
    broadcastChannel: 'auth',       // Custom BroadcastChannel name
  }}
>
  {children}
</AuthHookRegistry>
```

**Deprecated alias**: `<SWRLoginProvider>` (removed in v1.0).

## Hooks

### `useSession<TUser>()`

```ts
const { user, status } = useSession<MyUser>();
// status: 'loading' | 'authenticated' | 'unauthenticated'
```

### `useLoginMethod<M>(id: string)`

```ts
const handle = useLoginMethod<typeof passwordMethod>('swr-login/password');
// Returns ReturnType<M['use']> — fully typed Handle
```

### `useLoginMethods(filter?)`

```ts
const methods = useLoginMethods({ slot: 'primary', enabledOnly: true });
// Returns LoginMethod[] matching the filter
```

### `useAuthInternal()`

```ts
const { credential, refreshSession, publishEvent, registrySignal, createMethodAbort } = useAuthInternal();
// ⚠️ Only valid inside LoginMethod.use() or onRegistryMount
```

### `useSessionEvent(handler)`

```ts
useSessionEvent((event: SessionChangeEvent) => {
  if (event.kind === 'login') analytics.track('login', event);
});
// handler is ref-wrapped; no need for useCallback
```

### `useLogout()`

```ts
const { logout, isPending } = useLogout();
await logout(); // clears credential + publishes 'logout' event
```

### `useCredential()`

```ts
const credential = useCredential();
const token = credential.getAccessToken?.();
```

## Components

### `<AuthGuard>`

```tsx
<AuthGuard
  fallback={<LoginPage />}         // shown when unauthenticated
  roles={['admin']}                // optional role check
  loadingFallback={<Spinner />}    // shown while loading
>
  <Dashboard />
</AuthGuard>
```

### `<Slot name="primary">`

```tsx
<Slot name="primary">
  {(methods) => methods.map(m => <MethodButton key={m.id} method={m} />)}
</Slot>
```

## Error types

### `LoginRejection`

```ts
class LoginRejection extends Error {
  static is(err: unknown): err is LoginRejection;
  readonly code?: string;    // Machine code: 'ERR_INVALID_CREDENTIALS'
  readonly reason?: string;  // Semantic: 'invalid_credentials'
  readonly methodId?: string;
  readonly originalError?: unknown;
  readonly payload?: unknown;
}
```
