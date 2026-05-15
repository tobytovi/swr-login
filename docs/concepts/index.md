# Plugin-as-Hook

The central idea of swr-login v0.9: **every login method is a React Hook**.

## The LoginMethod contract

```ts
interface LoginMethod<TInput, TResult, THandle extends BaseLoginMethodHandle<TInput, TResult>> {
  readonly id: string;           // 'swr-login/password', 'acme/sso', …
  readonly meta: LoginMethodMeta;
  use(): THandle;                // MUST follow React Hook rules
  onRegistryMount?(internal: AuthInternalContext):
    Promise<(() => void) | void> | (() => void) | void;
}
```

- `id` — globally unique, format `scope/name` enforced in dev mode
- `meta` — label, icon, slot, order, enabled, env
- `use()` — returns a **Handle** object with `state`, `error`, `reset`, and method-specific fields
- `onRegistryMount` — optional async lifecycle hook (OAuth callbacks, Passkey setup, etc.)

## Hook order stability

React requires Hooks to be called in the same order every render.
When `methods` changes (e.g., gated features), Hook order would normally break.

swr-login solves this with `MethodSlotList`:

```
AuthHookRegistry
└─ MethodSlotList
   ├─ MethodSlot(passwordMethod)   → always calls passwordMethod.use()
   ├─ MethodSlot(githubMethod)     → always calls githubMethod.use()
   └─ MethodSlot(mockMethod)       → always calls mockMethod.use()
```

**Every MethodSlot always calls its method's `use()`**, regardless of `enabled`, `slot`, or `env`.
Visibility is controlled by filtering — not by omitting Hook calls.

## Method ID namespace

All method IDs must follow `scope/name` format in production. Dev mode enforces this:

| ID | Status |
|---|---|
| `swr-login/password` | ✅ Official |
| `acme/sso` | ✅ Third-party |
| `local/mock` | ✅ Local dev (exempted) |
| `test/anything` | ✅ Test suite (exempted) |
| `password` | ❌ Dev-mode error |

## Three-generic type inference

```ts
// The method object carries its types
const handle = useLoginMethod<typeof passwordMethod>('swr-login/password');
// TypeScript infers: PasswordHandle (including resetPasswordRequired, etc.)
```

The three generics `<TInput, TResult, THandle>` let authors add custom fields to Handle
without any framework changes. See [Method Author Guide](/method-author-guide/).
