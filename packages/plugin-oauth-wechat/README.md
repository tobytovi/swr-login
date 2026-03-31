# @swr-login/plugin-oauth-wechat

> WeChat OAuth login plugin for swr-login (QR code scan & H5 web authorization).

[![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-wechat?color=blue)](https://www.npmjs.com/package/@swr-login/plugin-oauth-wechat)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/plugin-oauth-wechat
```

## Usage

```ts
import { WeChatOAuthPlugin } from '@swr-login/plugin-oauth-wechat';

const plugin = WeChatOAuthPlugin({
  appId: 'your-wechat-app-id',
  redirectUri: 'https://yourapp.com/callback/wechat',
  // 'qrcode' (default) | 'h5'
  mode: 'qrcode',
});
```

Then use the `useLogin` hook:

```tsx
const { login, isLoading } = useLogin('wechat');

<button onClick={() => login()}>微信登录</button>
```

## Features

- 📱 QR code scan login (PC web)
- 🌐 H5 web authorization (mobile browser)
- 🔒 CSRF state parameter validation
- ⚡ Zero page refresh on login

## Part of swr-login

See the full project at [github.com/tobytovi/swr-login](https://github.com/tobytovi/swr-login).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
