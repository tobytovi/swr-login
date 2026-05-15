# Method Author Guide

How to build a custom `LoginMethod` for swr-login v0.9.

## Minimal method

```ts
import { defineLoginMethod, useAuthInternal, LoginRejection } from 'swr-login';
import { useState } from 'react';

export const myMethod = defineLoginMethod<{ token: string }, { user: unknown }>({
  id: 'acme/sso',                           // ← scope/name required
  meta: { label: 'Acme SSO', slot: 'primary' },

  use() {
    const { refreshSession, publishEvent } = useAuthInternal();
    const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [error, setError] = useState<LoginRejection | undefined>();

    return {
      state,
      error,
      reset: () => { setState('idle'); setError(undefined); },
      submit: async ({ token }) => {
        setState('pending');
        try {
          const user = await exchangeToken(token);
          await refreshSession();
          publishEvent({ kind: 'login', methodId: 'acme/sso', timestamp: Date.now() });
          setState('success');
          return { user };
        } catch (err) {
          const rej = new LoginRejection('SSO failed', { code: 'ERR_SSO', cause: err });
          setError(rej);
          setState('error');
          throw rej;
        }
      },
    };
  },
});
```

## Factory function pattern (required for official methods)

```ts
export function createMyMethod(config: MyMethodConfig): LoginMethod<...> {
  return defineLoginMethod({ id: config.id ?? 'acme/sso', ... });
}
export const myMethod = createMyMethod({});
```

## onRegistryMount

```ts
onRegistryMount: async (internal) => {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) return;

  const token = await exchangeOAuthCode(code, internal.registrySignal);
  await internal.refreshSession();
  internal.publishEvent({ kind: 'login', methodId: 'acme/oauth', timestamp: Date.now() });

  // Clean URL
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  // Return cleanup (called on unmount)
  return () => { /* cleanup */ };
},
```

## package.json metadata

```json
{
  "name": "@acme/method-sso",
  "swr-login": {
    "methodVersion": "1.0",
    "category": "sso",
    "methodId": "acme/sso",
    "compilerCompat": true
  },
  "peerDependencies": {
    "swr-login": "^1.0.0"
  }
}
```

## Conformance test

```ts
import { testLoginMethod, createMockCredential } from '@swr-login/testing';

testLoginMethod(myMethod, {
  mockCredential: createMockCredential(),
  testSubmit: async (handle) => {
    await handle.submit!({ token: 'mock-token' });
    expect(handle.state).toBe('success');
  },
});
```

## React Compiler compatibility

- Do not call Hooks conditionally inside `use()`
- Do not mutate returned Handle object references after returning
- Prefer `useState` + `useCallback` over closures capturing mutable variables
- Mark the `use()` method with `'use client'` directive if used in RSC contexts
