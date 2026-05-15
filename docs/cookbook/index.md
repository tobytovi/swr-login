# Cookbook

Practical recipes for common swr-login patterns.

## Recipes

- **[OAuth Redirect Flow](./oauth-redirect)** — Handle `?code=&state=` callback via `onRegistryMount`
- **[useSessionEvent](./session-event)** — Subscribe to session events in any component
- **[401 Interceptor](./401-interceptor)** — Trigger `session_lost` via `Credential.onExpire`
- **[Redirect-type Method](./redirect-method)** — Build a method that redirects instead of submitting
- **[Coexist with non-swr-login](./coexist)** — Integrate with existing non-swr-login auth flows
- **[Multi-step Method](./multi-step)** — Build a class-code / wizard-style login flow

---

## OAuth Redirect Flow

Handle the OAuth `?code=&state=` callback in `onRegistryMount`:

```ts
export const githubMethod = createGitHubOAuthMethod({
  clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!,
  callbackUrl: '/api/auth/github/callback',
});
// onRegistryMount is called automatically at mount time.
// It reads window.location.search, detects ?code=, exchanges for token,
// calls refreshSession(), then cleans URL via replaceState.
```

The key: because `onRegistryMount` runs **before** any `method.use()` completes its first render,
the session is refreshed before the page renders protected content.

---

## useSessionEvent

Track session changes anywhere in the component tree:

```tsx
function ActivityLogger() {
  useSessionEvent((event) => {
    // handler is ref-wrapped — no useCallback needed
    console.log('[audit]', event.kind, event.user, event.timestamp);
  });
  return null;
}
```

---

## 401 Interceptor

Wire a fetch interceptor to `Credential.onExpire`:

```ts
// In your HTTP client setup (axios, ky, custom fetch wrapper):
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      credential.onExpire?.(); // → triggers session_lost event
    }
    return Promise.reject(error);
  },
);
```

`AuthHookRegistry` sets `credential.onExpire` to clear local session state and publish
`{ kind: 'session_lost' }`.

---

## Multi-step Method

See the [Aidemy example](https://github.com/tobytovi/swr-login/tree/main/examples/aidemy-multistep)
for a full class-code multi-step method implementation.

Key pattern:

```ts
export const classCodeMethod = defineLoginMethod<never, never, ClassCodeHandle>({
  id: 'aidemy/class-code',
  meta: { label: '班级码登录', multiStep: true },
  use(): ClassCodeHandle {
    const [step, setStep] = useState<Step>('idle');
    // No submit() — expose domain-specific methods instead
    return {
      state: step === 'idle' ? 'idle' : 'pending',
      currentStep: step,
      verifyCode: async ({ classCode, loginCode }) => { ... },
      selectStudent: async (userId) => { ... },
      reset: () => setStep('idle'),
    };
  },
});
```
