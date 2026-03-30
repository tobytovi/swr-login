# swr-login

> The best React Hook for auth state management. Works with any backend.

Unified entry package for the **swr-login** ecosystem. Install this one package to get everything you need.

## Install

```bash
npm install swr-login react swr
# or
pnpm add swr-login react swr
```

## Quick Start

```tsx
import { SWRLoginProvider, useLogin, useUser, useLogout } from 'swr-login';
import { JWTAdapter } from 'swr-login/adapters/jwt';
import { PasswordPlugin } from 'swr-login/plugins/password';

const config = {
  adapter: JWTAdapter(),
  plugins: [
    PasswordPlugin({ loginUrl: '/api/auth/login' }),
  ],
  fetchUser: (token) =>
    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()),
};

function App() {
  return (
    <SWRLoginProvider config={config}>
      <Dashboard />
    </SWRLoginProvider>
  );
}

function Dashboard() {
  const { user, isLoading } = useUser();
  const { login } = useLogin('password');
  const { logout } = useLogout();

  if (isLoading) return <p>Loading...</p>;
  if (!user) {
    return (
      <button onClick={() => login({ username: 'alice', password: 'secret' })}>
        Login
      </button>
    );
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## What's Included

The main entry (`swr-login`) re-exports everything from:

| Package | Description |
|---------|-------------|
| `@swr-login/core` | State machine, token management, plugin system, event emitter |
| `@swr-login/react` | Provider, Hooks (`useLogin`, `useUser`, `useLogout`, `useSession`, `usePermission`), `AuthGuard` |

## Sub-path Imports

Adapters and plugins are available via sub-path imports to keep the main bundle lean:

### Adapters

```ts
import { JWTAdapter } from 'swr-login/adapters/jwt';
import { CookieAdapter } from 'swr-login/adapters/cookie';
import { SessionAdapter } from 'swr-login/adapters/session';
```

### Plugins

```ts
import { PasswordPlugin } from 'swr-login/plugins/password';
import { GitHubOAuthPlugin } from 'swr-login/plugins/oauth-github';
import { GoogleOAuthPlugin } from 'swr-login/plugins/oauth-google';
import { WeChatPlugin } from 'swr-login/plugins/oauth-wechat';
import { PasskeyPlugin } from 'swr-login/plugins/passkey';
```

## Peer Dependencies

- `react` >= 18.0.0
- `swr` >= 2.0.0

## Fine-grained Imports

If you prefer installing only what you need, use the scoped packages directly:

```bash
pnpm add @swr-login/core @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

## License

MIT
