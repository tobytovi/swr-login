# @swr-login/plugin-password

> Username/password login plugin for swr-login.

[![npm](https://img.shields.io/npm/v/@swr-login/plugin-password?color=blue)](https://www.npmjs.com/package/@swr-login/plugin-password)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/plugin-password
```

## Usage

```ts
import { PasswordPlugin } from '@swr-login/plugin-password';

const plugin = PasswordPlugin({
  loginUrl: '/api/login',
});
```

Then use the `useLogin` hook:

```tsx
const { login, isLoading, error } = useLogin('password');

await login({ username: 'alice', password: 'secret' });
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `loginUrl` | `string` | ✅ | Your backend login endpoint |

## Part of swr-login

See the full project at [github.com/tobytovi/swr-login](https://github.com/tobytovi/swr-login).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
