# @swr-login/plugin-passkey

> WebAuthn/Passkey login plugin for swr-login (biometric & security key authentication).

[![npm](https://img.shields.io/npm/v/@swr-login/plugin-passkey?color=blue)](https://www.npmjs.com/package/@swr-login/plugin-passkey)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/swr-login/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/plugin-passkey
```

## Usage

```ts
import { PasskeyPlugin } from '@swr-login/plugin-passkey';

const plugin = PasskeyPlugin({
  rpId: 'yourapp.com',
  rpName: 'Your App',
});
```

Then use the `useLogin` hook:

```tsx
const { login, isLoading } = useLogin('passkey');

<button onClick={() => login()}>Sign in with Passkey</button>
```

## Features

- 🔐 WebAuthn / FIDO2 standard
- 👆 Biometric authentication (Face ID, Touch ID, fingerprint)
- 🔑 Security key support (YubiKey, etc.)
- 🔒 Phishing-resistant — no passwords to steal
- ⚡ Zero page refresh on login

## Part of swr-login

See the full project at [github.com/swr-login/swr-login](https://github.com/swr-login/swr-login).

## License

[MIT](https://github.com/swr-login/swr-login/blob/main/LICENSE)
