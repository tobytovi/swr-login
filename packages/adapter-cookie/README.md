# @swr-login/adapter-cookie

> Cookie storage adapter for swr-login (works with BFF pattern for HttpOnly cookies).

[![npm](https://img.shields.io/npm/v/@swr-login/adapter-cookie?color=blue)](https://www.npmjs.com/package/@swr-login/adapter-cookie)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/swr-login/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/adapter-cookie
```

## Usage

```ts
import { CookieAdapter } from '@swr-login/adapter-cookie';

const adapter = CookieAdapter({
  // Cookie options
  sameSite: 'Lax',
  secure: true,
});
```

## When to use

Use this adapter when your app follows the **BFF (Backend For Frontend)** pattern and tokens are stored as HttpOnly cookies managed by the server.

## Part of swr-login

See the full project at [github.com/swr-login/swr-login](https://github.com/swr-login/swr-login).

## License

[MIT](https://github.com/swr-login/swr-login/blob/main/LICENSE)
