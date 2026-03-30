<div align="center">

# 🔐 swr-login

**The best React Hook for auth state management.**

Works with Auth.js, Better Auth, Clerk, or your own backend.

[![npm](https://img.shields.io/npm/v/@swr-login/core?color=blue)](https://www.npmjs.com/package/@swr-login/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@swr-login/core?label=core%20size)](https://bundlephobia.com/package/@swr-login/core)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

[English](#features) · [中文](./README.zh-CN.md)

</div>

---

## Features

- ⚡ **SWR-Powered** — Stale-while-revalidate strategy for instant auth state. No loading spinners.
- 🔌 **Plugin Architecture** — Every login channel is an independent npm package. Install only what you need.
- 🔄 **Zero-Refresh Login/Logout** — Token silent refresh, optimistic UI, cross-tab sync via BroadcastChannel.
- 🪶 **Tiny Core** — `@swr-login/core` is <3KB gzipped. No bloat.
- 🛡️ **Secure by Default** — PKCE, CSRF state validation, HttpOnly cookie support, sensitive data cleanup.
- 📦 **100% TypeScript** — Full generics, JSDoc on every API, AI-coding-assistant friendly.
- 🎯 **Framework Agnostic Core** — React bindings in `@swr-login/react`, core logic is UI-free.

## Quick Start

```bash
# Install core + react + JWT adapter + password plugin
npm install @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

```tsx
import { SWRLoginProvider, useLogin, useUser, useLogout } from '@swr-login/react';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';

// 1. Configure provider
function App() {
  return (
    <SWRLoginProvider
      config={{
        adapter: JWTAdapter(),
        plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
        fetchUser: (token) =>
          fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()),
      }}
    >
      <MyApp />
    </SWRLoginProvider>
  );
}

// 2. Use hooks anywhere
function LoginButton() {
  const { login, isLoading } = useLogin('password');
  const { user, isAuthenticated } = useUser();
  const { logout } = useLogout();

  if (isAuthenticated) {
    return (
      <div>
        <span>Hello, {user.name}!</span>
        <button onClick={() => logout()}>Sign Out</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login({ username: 'alice', password: 'secret' })}
      disabled={isLoading}
    >
      Sign In
    </button>
  );
}
```

**That's it.** No page refresh. All components using `useUser()` update instantly.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your React App                     │
├─────────────────────────────────────────────────────┤
│   Hook Layer (@swr-login/react)                      │
│   useLogin · useUser · useLogout · useSession        │
│   usePermission · AuthGuard                          │
├─────────────────────────────────────────────────────┤
│   Plugin Layer                                       │
│   🔑 password · 🔵 google · ⚫ github               │
│   🟢 wechat · 🔐 passkey                            │
├─────────────────────────────────────────────────────┤
│   Core Layer (@swr-login/core)                       │
│   StateMachine · TokenManager · PluginManager        │
│   EventEmitter · BroadcastSync                       │
├─────────────────────────────────────────────────────┤
│   Storage Adapters                                   │
│   JWT · Session · Cookie (BFF)                       │
└─────────────────────────────────────────────────────┘
```

## Core Hooks

| Hook | Purpose |
|------|---------|
| `useLogin(pluginName?)` | Trigger login flow via any registered plugin |
| `useUser<T>()` | Get current user with SWR caching & auto-revalidation |
| `useLogout()` | Secure logout with cross-tab broadcast |
| `useSession()` | Access raw tokens, expiry info |
| `usePermission()` | Check roles & permissions declaratively |

## AuthGuard Component

```tsx
<AuthGuard
  permissions={['admin', 'editor']}
  requireAll={false}
  fallback={<Navigate to="/login" />}
  loadingComponent={<Skeleton />}
>
  <ProtectedContent />
</AuthGuard>
```

## Official Plugins

| Package | Channel | Auth Method |
|---------|---------|-------------|
| `@swr-login/plugin-password` | Username/Password | Form POST |
| `@swr-login/plugin-oauth-google` | Google | OAuth 2.0 + PKCE (Popup/Redirect) |
| `@swr-login/plugin-oauth-github` | GitHub | OAuth (Popup/Redirect) |
| `@swr-login/plugin-oauth-wechat` | WeChat | QR Code Scan / H5 Web Auth |
| `@swr-login/plugin-passkey` | Passkey/WebAuthn | Biometric / Security Key |

## Storage Adapters

| Package | Strategy | Best For |
|---------|----------|----------|
| `@swr-login/adapter-jwt` | localStorage / sessionStorage / memory | SPAs (default) |
| `@swr-login/adapter-session` | sessionStorage | Tab-scoped sessions |
| `@swr-login/adapter-cookie` | Cookie (SameSite + Secure) | BFF pattern |

## Custom Plugin

Build your own login channel in minutes:

```ts
import type { SWRLoginPlugin } from '@swr-login/core';

const MyPlugin: SWRLoginPlugin<{ token: string }> = {
  name: 'my-sso',
  type: 'oauth',
  async login({ token }, ctx) {
    const res = await fetch('/api/sso/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    ctx.setTokens({ accessToken: data.accessToken, expiresAt: data.expiresAt });
    return data;
  },
};
```

## Comparison

| Feature | swr-login | Auth.js v5 | Clerk | Better Auth |
|---------|:---------:|:----------:|:-----:|:-----------:|
| Zero-refresh login/logout | ✅ Best | ⚠️ | ✅ | ⚠️ |
| Bundle size (core) | **<3KB** | ~30KB | ~50KB | ~15KB |
| Plugin architecture | ✅ | ❌ | ❌ | ✅ |
| WeChat / Alipay | ✅ | ❌ | ❌ | ❌ |
| Framework agnostic core | ✅ | ⚠️ | ❌ | ✅ |
| Full TypeScript generics | ✅ | ⚠️ | ✅ | ✅ |
| Free & open source | ✅ MIT | ✅ MIT | ❌ Paid | ✅ MIT |

## Security

- **PKCE** enforced for all OAuth flows
- **CSRF state** parameter validation on every callback
- **BFF-friendly** cookie adapter for HttpOnly token storage
- **Cross-tab sync** logout via BroadcastChannel
- **Auto token cleanup** on page visibility change (optional)

## License

[MIT](./LICENSE)

---

<div align="center">

**[Documentation](https://swr-login.dev)** · **[Examples](./examples)** · **[Discord](https://discord.gg/swr-login)**

Made with ❤️ for the React community

</div>
