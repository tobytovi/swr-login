# @swr-login/react

> React bindings for swr-login: Provider, Hooks, and AuthGuard component.

[![npm](https://img.shields.io/npm/v/@swr-login/react?color=blue)](https://www.npmjs.com/package/@swr-login/react)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

## Quick Start

```tsx
import { SWRLoginProvider, useLogin, useUser, useLogout } from '@swr-login/react';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';

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

## Hooks

| Hook | Purpose |
|------|---------|
| `useLogin(pluginName?)` | Trigger login flow via any registered plugin |
| `useUser<T>()` | Get current user with SWR caching & auto-revalidation |
| `useLogout()` | Secure logout with cross-tab broadcast |
| `useSession()` | Access raw tokens, expiry info |
| `usePermission()` | Check roles & permissions declaratively |

## AuthGuard

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

## Part of swr-login

This package is the React layer of [swr-login](https://github.com/tobytovi/swr-login). The framework-agnostic core is [`@swr-login/core`](https://www.npmjs.com/package/@swr-login/core).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
