# @swr-login/plugin-oauth-github

> GitHub OAuth login plugin for swr-login (supports Popup & Redirect).

[![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-github?color=blue)](https://www.npmjs.com/package/@swr-login/plugin-oauth-github)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/swr-login/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/plugin-oauth-github
```

## Usage

```ts
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';

const plugin = GitHubOAuthPlugin({
  clientId: 'your-github-client-id',
  redirectUri: 'https://yourapp.com/callback/github',
  // 'popup' (default) | 'redirect'
  mode: 'popup',
});
```

Then use the `useLogin` hook:

```tsx
const { login, isLoading } = useLogin('github');

<button onClick={() => login()}>Sign in with GitHub</button>
```

## Features

- 🔒 CSRF state parameter validation
- 🪟 Popup and redirect modes
- ⚡ Zero page refresh on login

## Part of swr-login

See the full project at [github.com/swr-login/swr-login](https://github.com/swr-login/swr-login).

## License

[MIT](https://github.com/swr-login/swr-login/blob/main/LICENSE)
