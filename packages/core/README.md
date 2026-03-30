# @swr-login/core

> Core logic for swr-login: state machine, token management, plugin system, event emitter.

[![npm](https://img.shields.io/npm/v/@swr-login/core?color=blue)](https://www.npmjs.com/package/@swr-login/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@swr-login/core)](https://bundlephobia.com/package/@swr-login/core)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/swr-login/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/core
```

## Features

- ⚡ **SWR-Powered** — Stale-while-revalidate strategy for instant auth state
- 🔌 **Plugin Architecture** — Every login channel is an independent package
- 🔄 **Cross-tab Sync** — BroadcastChannel-based login/logout sync
- 🪶 **Tiny** — <3KB gzipped
- 📦 **100% TypeScript** — Full generics and JSDoc

## Usage

```ts
import { createAuthClient } from '@swr-login/core';

const client = createAuthClient({
  adapter: myAdapter,
  plugins: [myPlugin],
  fetchUser: async (token) => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },
});
```

## Custom Plugin

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

## Part of swr-login

This is the framework-agnostic core of the [swr-login](https://github.com/swr-login/swr-login) project. For React bindings, see [`@swr-login/react`](https://www.npmjs.com/package/@swr-login/react).

## License

[MIT](https://github.com/swr-login/swr-login/blob/main/LICENSE)
