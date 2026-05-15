---
layout: home

hero:
  name: "swr-login"
  text: "Plugin-as-Hook React Auth"
  tagline: "Every login method is a React Hook. Zero framework lock-in."
  image:
    src: /logo.svg
    alt: swr-login
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/tobytovi/swr-login

features:
  - icon: 🪝
    title: Plugin-as-Hook
    details: Every auth method is a React Hook. Unlimited extensibility, type-safe handle inference.
  - icon: 🔋
    title: Zero External State
    details: Session state via useSyncExternalStore. No SWR, no Zustand, no Redux required.
  - icon: 🔒
    title: Stable Hook Order
    details: MethodSlotList ensures Hook call order is always stable, preventing React errors.
  - icon: ⚡
    title: onRegistryMount
    details: Run async side-effects (OAuth callback handling, Passkey registration) at mount time.
  - icon: 🌐
    title: Multi-tab Sync
    details: BroadcastSync keeps session state consistent across browser tabs out of the box.
  - icon: 🧪
    title: Conformance Test Suite
    details: "@swr-login/testing provides testLoginMethod() to validate any custom method."
---

## Installation

```sh
npm install swr-login
# or
pnpm add swr-login
```

## Quick Example

```tsx
import { AuthHookRegistry, useSession, useLoginMethod } from 'swr-login';
import { createPasswordMethod } from 'swr-login/methods/password';
import { createJWTCredential } from 'swr-login/adapters/jwt';

const credential = createJWTCredential({ storage: 'localStorage' });
const passwordMethod = createPasswordMethod({ loginUrl: '/api/auth/login' });

function App() {
  return (
    <AuthHookRegistry credential={credential} methods={[passwordMethod]} fetchSession={fetchUser}>
      <LoginPage />
    </AuthHookRegistry>
  );
}

function LoginPage() {
  const handle = useLoginMethod<typeof passwordMethod>('swr-login/password');
  const { status } = useSession();
  // handle.submit({ username, password }) → fully typed!
}
```

> **v0.9.0-alpha.0** — Plugin-as-Hook architecture. See [Migration Guide](/migration/) for upgrading from v0.7.
