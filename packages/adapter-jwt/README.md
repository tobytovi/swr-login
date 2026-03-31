# @swr-login/adapter-jwt

> JWT token storage adapter for swr-login (localStorage / sessionStorage / memory).

[![npm](https://img.shields.io/npm/v/@swr-login/adapter-jwt?color=blue)](https://www.npmjs.com/package/@swr-login/adapter-jwt)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/adapter-jwt
```

## Usage

```ts
import { JWTAdapter } from '@swr-login/adapter-jwt';

const adapter = JWTAdapter({
  // 'localStorage' (default) | 'sessionStorage' | 'memory'
  storage: 'localStorage',
});
```

Then pass it to your swr-login config:

```tsx
<SWRLoginProvider config={{ adapter, plugins: [...], fetchUser }}>
  <App />
</SWRLoginProvider>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `'localStorage' \| 'sessionStorage' \| 'memory'` | `'localStorage'` | Where to persist tokens |

## Part of swr-login

See the full project at [github.com/tobytovi/swr-login](https://github.com/tobytovi/swr-login).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
