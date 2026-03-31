# @swr-login/plugin-oauth-google

> Google OAuth 2.0 login plugin for swr-login (supports Popup & Redirect with PKCE).

[![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-google?color=blue)](https://www.npmjs.com/package/@swr-login/plugin-oauth-google)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/plugin-oauth-google
```

## Usage

```ts
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';

const plugin = GoogleOAuthPlugin({
  clientId: 'your-google-client-id',
  redirectUri: 'https://yourapp.com/callback/google',
  // 'popup' (default) | 'redirect'
  mode: 'popup',
});
```

Then use the `useLogin` hook:

```tsx
const { login, isLoading } = useLogin('google');

<button onClick={() => login()}>Sign in with Google</button>
```

## Features

- 🔒 PKCE (Proof Key for Code Exchange) enforced
- 🔒 CSRF state parameter validation
- 🪟 Popup and redirect modes
- ⚡ Zero page refresh on login

## Part of swr-login

See the full project at [github.com/tobytovi/swr-login](https://github.com/tobytovi/swr-login).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
