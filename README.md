<div align="center">

# 🔐 swr-login

**The best React Hook for auth state management.**

Works with Auth.js, Better Auth, Clerk, or your own backend.

[![npm](https://img.shields.io/npm/v/swr-login?color=blue)](https://www.npmjs.com/package/swr-login)
[![bundle size](https://img.shields.io/bundlephobia/minzip/swr-login?label=size)](https://bundlephobia.com/package/swr-login)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

[English](#features) · [中文](https://github.com/tobytovi/swr-login/blob/main/README.zh-CN.md)

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
- 🔗 **Multi-Step Login** — Built-in support for multi-step interactive login flows (MFA, SMS verification, class-code login, etc.).
- 🪝 **afterAuth Hook** — Intercept post-login flow before `fetchUser`. Role-based redirect, skip fetchUser, or abort login.
- 🛡️ **fetchUser Error Handling** — Built-in `validateUserOnLogin`, `onFetchUserError` callback with retry / logout / ignore strategies.

## Quick Start

```bash
npm install swr-login react swr
```

```tsx
import { SWRLoginProvider, useLogin, useUser, useLogout } from 'swr-login';
import { presets } from 'swr-login/presets';

// 1. One-line config with presets
const config = presets.password({
  loginUrl: '/api/login',
  userUrl: '/api/me',
});

function App() {
  return (
    <SWRLoginProvider config={config}>
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

## What's Inside `swr-login`

The `swr-login` package is an **all-in-one umbrella package** — install it once and you get everything. No need to install sub-packages separately.

```bash
npm install swr-login
# That's all you need. Every adapter and plugin is included.
```

It bundles the following sub-packages and re-exports them via sub-path imports:

| Sub-path Import | Included Package | Description |
|-----------------|-----------------|-------------|
| `swr-login` | `@swr-login/core` + `@swr-login/react` | Core logic + React bindings (Provider, Hooks, AuthGuard) |
| `swr-login/presets` | — | Ready-to-use config presets (password, social, passkey, full) |
| `swr-login/adapters/jwt` | `@swr-login/adapter-jwt` | JWT token storage (localStorage / sessionStorage / memory) |
| `swr-login/adapters/session` | `@swr-login/adapter-session` | Session storage (tab-scoped, cleared on close) |
| `swr-login/adapters/cookie` | `@swr-login/adapter-cookie` | Cookie storage (BFF pattern, HttpOnly support) |
| `swr-login/plugins/password` | `@swr-login/plugin-password` | Username / Password login |
| `swr-login/plugins/oauth-google` | `@swr-login/plugin-oauth-google` | Google OAuth 2.0 + PKCE |
| `swr-login/plugins/oauth-github` | `@swr-login/plugin-oauth-github` | GitHub OAuth |
| `swr-login/plugins/oauth-wechat` | `@swr-login/plugin-oauth-wechat` | WeChat QR Code / H5 Web Auth |
| `swr-login/plugins/passkey` | `@swr-login/plugin-passkey` | WebAuthn / Passkey (Biometric / Security Key) |

All adapters and plugins are declared as `optionalDependencies`, so your package manager installs them automatically but they won't break your build if a platform doesn't support one.

> 💡 **Prefer granular control?** You can still install individual `@swr-login/*` scoped packages — see [Fine-grained Imports](#fine-grained-imports).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your React App                     │
├─────────────────────────────────────────────────────┤
│   Hook Layer (@swr-login/react)                      │
│   useLogin · useUser · useLogout · useSession        │
│   useMultiStepLogin · useAuthInjector                │
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

## Presets

Presets provide ready-to-use configurations for common auth scenarios. Just provide the essential parameters:

### Password Login

```ts
import { presets } from 'swr-login/presets';

const config = presets.password({
  loginUrl: '/api/auth/login',
  logoutUrl: '/api/auth/logout',
  userUrl: '/api/me',
});
```

### Social Login (OAuth)

```ts
const config = presets.social({
  providers: {
    github: { clientId: 'your-github-client-id' },
    google: { clientId: 'your-google-client-id' },
    wechat: { appId: 'wx_your_app_id' },
  },
  userUrl: '/api/me',
});
```

### Passkey (WebAuthn)

```ts
const config = presets.passkey({
  registerOptionsUrl: '/api/auth/passkey/register/options',
  registerVerifyUrl: '/api/auth/passkey/register/verify',
  loginOptionsUrl: '/api/auth/passkey/login/options',
  loginVerifyUrl: '/api/auth/passkey/login/verify',
  userUrl: '/api/me',
});
```

### Full (Password + Social + Passkey)

```ts
const config = presets.full({
  password: { loginUrl: '/api/auth/login' },
  providers: {
    github: { clientId: 'gh-client-id' },
    google: { clientId: 'google-client-id' },
  },
  passkey: {
    registerOptionsUrl: '/api/auth/passkey/register/options',
    registerVerifyUrl: '/api/auth/passkey/register/verify',
    loginOptionsUrl: '/api/auth/passkey/login/options',
    loginVerifyUrl: '/api/auth/passkey/login/verify',
  },
  userUrl: '/api/me',
});
```

All presets support extra options like `onLogin`, `onLogout`, `onError`, `security`, and `adapterOptions`.

## `createAuthConfig`

For advanced use cases, use `createAuthConfig` to get full type-safety and IDE auto-completion when building config manually:

```ts
// auth.config.ts
import { createAuthConfig } from 'swr-login';
import { JWTAdapter } from 'swr-login/adapters/jwt';
import { PasswordPlugin } from 'swr-login/plugins/password';

export default createAuthConfig({
  adapter: JWTAdapter({ storage: 'localStorage' }),
  plugins: [PasswordPlugin({ loginUrl: '/api/auth/login' })],
  fetchUser: (token) =>
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()),
  onLogin: (user) => console.log('Logged in:', user.name),

  // Intercept after plugin login, before fetchUser
  afterAuth: async ({ pluginName, authResponse, skipFetchUser }) => {
    const role = decodeJwt(authResponse.accessToken).role;
    if (role === 'admin') {
      skipFetchUser(); // admins don't need fetchUser
      window.location.href = '/admin';
    }
  },

  // Validate user immediately after login (default: true)
  validateUserOnLogin: true,

  // Handle fetchUser errors globally
  onFetchUserError: (error) => {
    if (error.message.includes('disabled')) return 'logout';
    return 'ignore';
  },
});
```

```tsx
// App.tsx
import { SWRLoginProvider } from 'swr-login';
import authConfig from './auth.config';

function App() {
  return (
    <SWRLoginProvider config={authConfig}>
      <MyApp />
    </SWRLoginProvider>
  );
}
```

## Lifecycle Hooks

### `afterAuth`

The `afterAuth` hook runs **after a plugin's `login()` succeeds** but **before `fetchUser` is called**. This gives you a chance to inspect the auth response, perform role-based redirects, or skip `fetchUser` entirely.

```ts
const config = createAuthConfig({
  // ...plugins, adapter, fetchUser...
  afterAuth: async ({ pluginName, authResponse, skipFetchUser }) => {
    // Example: redirect teachers to a different app
    if (pluginName === 'password') {
      const role = await checkUserRole(authResponse.accessToken);
      if (role === 'teacher') {
        skipFetchUser();
        window.location.href = '/teacher-admin';
        return;
      }
    }
    // Default: continue to fetchUser
  },
});
```

| Behavior | How |
|----------|-----|
| Continue to `fetchUser` | Return normally (don't call `skipFetchUser`) |
| Skip `fetchUser` | Call `context.skipFetchUser()` — `login()` resolves immediately |
| Abort login & rollback tokens | Throw an error — tokens are cleared, `login()` rejects |

> **Note:** `afterAuth` only runs during explicit `login()` calls, not during SWR background revalidation.

### `onFetchUserError`

Handle errors from `fetchUser` globally — both during login validation and SWR background revalidation:

```ts
const config = createAuthConfig({
  // ...
  onFetchUserError: (error) => {
    if (error.message.includes('account disabled')) return 'logout';
    if (error.message.includes('network')) return 'retry';
    return 'ignore'; // keep current state, error stored in lastError
  },
});
```

| Strategy | Effect |
|----------|--------|
| `'retry'` | Re-invoke `fetchUser` once (max 1 retry to prevent loops) |
| `'logout'` | Clear tokens, transition to `unauthenticated` |
| `'ignore'` | Keep current state; error is available via `useUser().lastError` |

### `validateUserOnLogin`

When `true` (default), `login()` automatically calls `fetchUser` after the plugin succeeds. If `fetchUser` throws (e.g., "account disabled"), `login()` rejects and tokens are rolled back.

Set to `false` to skip this validation:

```ts
const config = createAuthConfig({
  validateUserOnLogin: false, // login() resolves without calling fetchUser
});
```

## Core Hooks

| Hook | Purpose |
|------|---------|
| `useLogin(pluginName?)` | Trigger login flow via any registered plugin |
| `useMultiStepLogin(pluginName)` | Drive multi-step login flows with step state management |
| `useAuthInjector()` | Inject external auth state into swr-login (escape hatch) |
| `useUser<T>()` | Get current user with SWR caching, auto-revalidation, `lastError` & `clearError` |
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
| `swr-login/plugins/password` | Username/Password | Form POST |
| `swr-login/plugins/oauth-google` | Google | OAuth 2.0 + PKCE (Popup/Redirect) |
| `swr-login/plugins/oauth-github` | GitHub | OAuth (Popup/Redirect) |
| `swr-login/plugins/oauth-wechat` | WeChat | QR Code Scan / H5 Web Auth |
| `swr-login/plugins/passkey` | Passkey/WebAuthn | Biometric / Security Key |

## Storage Adapters

| Package | Strategy | Best For |
|---------|----------|----------|
| `swr-login/adapters/jwt` | localStorage / sessionStorage / memory | SPAs (default) |
| `swr-login/adapters/session` | sessionStorage | Tab-scoped sessions |
| `swr-login/adapters/cookie` | Cookie (SameSite + Secure) | BFF pattern |

## Multi-Step Login

For login flows that require multiple steps with UI interaction in between (e.g., class-code login, MFA, SMS verification), use `MultiStepLoginPlugin` + `useMultiStepLogin`:

### Define a Multi-Step Plugin

```ts
import type { MultiStepLoginPlugin } from 'swr-login';

const ClassCodePlugin: MultiStepLoginPlugin<{ classCode: string; loginCode: string }> = {
  name: 'class-code',
  type: 'multi-step',
  steps: [
    {
      name: 'verify-code',
      async execute({ classCode, loginCode }, ctx) {
        const res = await fetch('/api/class-login', {
          method: 'POST',
          body: JSON.stringify({ classCode, loginCode }),
        }).then(r => r.json());
        return { classLoginToken: res.class_login_token };
      },
    },
    {
      name: 'select-student',
      async execute({ classLoginToken }, ctx) {
        const res = await fetch(`/api/class-students?token=${classLoginToken}`)
          .then(r => r.json());
        return { students: res.list, classLoginToken };
      },
    },
    {
      name: 'get-token',
      async execute({ userId, classLoginToken }, ctx) {
        const res = await fetch('/api/class-student-token', {
          method: 'POST',
          body: JSON.stringify({ userId, classLoginToken }),
        }).then(r => r.json());
        return { skey: res.skey, userId: res.user_id };
      },
    },
  ],
  async finalizeAuth({ skey, userId }, ctx) {
    ctx.setTokens({ accessToken: skey, expiresAt: Date.now() + 86400000 });
    return {
      user: { id: userId, name: '' },
      accessToken: skey,
      expiresAt: Date.now() + 86400000,
    };
  },
  // Required by SWRLoginPlugin interface, but not used for multi-step
  async login() { throw new Error('Use useMultiStepLogin()'); },
};
```

### Use in Components

```tsx
import { useMultiStepLogin } from 'swr-login';

function ClassCodeLoginFlow() {
  const {
    currentStepName, stepData, start, next, back, isLoading, error, isComplete,
  } = useMultiStepLogin<{ classCode: string; loginCode: string }>('class-code');

  if (isComplete) return <Navigate to="/dashboard" />;

  if (currentStepName === 'select-student') {
    return (
      <StudentList
        students={stepData.students}
        onSelect={(userId) => next({ userId, classLoginToken: stepData.classLoginToken })}
        onBack={back}
        isLoading={isLoading}
      />
    );
  }

  // Default: show the code input form
  return <ClassCodeForm onSubmit={start} isLoading={isLoading} error={error} />;
}
```

### Inject External Auth State

For cases where the login flow is entirely managed outside swr-login (e.g., third-party SDK, iframe login), use `useAuthInjector` as an escape hatch:

```tsx
import { useAuthInjector } from 'swr-login';

function ExternalLoginCallback() {
  const { injectAuth } = useAuthInjector();

  const handleCallback = async (token: string, user: User) => {
    await injectAuth({
      user,
      accessToken: token,
      expiresAt: Date.now() + 86400000,
    });
    // All useUser() / AuthGuard components now recognize the login state
    router.push('/dashboard');
  };
}
```

## Custom Plugin

Build your own login channel in minutes:

```ts
import type { SWRLoginPlugin } from 'swr-login';

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

## Fine-grained Imports

If you prefer installing only the packages you need, all sub-packages are available individually:

```bash
npm install @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

```ts
import { SWRLoginProvider, useLogin } from '@swr-login/react';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';
```

See the full list of scoped packages in the [中文文档](https://github.com/tobytovi/swr-login/blob/main/README.zh-CN.md#包列表).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

---

<div align="center">

**[Documentation](https://swr-login.dev)** · **[Examples](https://github.com/tobytovi/swr-login/tree/main/examples)** · **[Discord](https://discord.gg/swr-login)**

Made with ❤️ for the React community

</div>
