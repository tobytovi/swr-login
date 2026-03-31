# @swr-login/adapter-session

> Session storage adapter for swr-login (auto-clears when tab closes).

[![npm](https://img.shields.io/npm/v/@swr-login/adapter-session?color=blue)](https://www.npmjs.com/package/@swr-login/adapter-session)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)

## Install

```bash
npm install @swr-login/adapter-session
```

## Usage

```ts
import { SessionAdapter } from '@swr-login/adapter-session';

const adapter = SessionAdapter();
```

## When to use

Use this adapter when you want auth tokens to be **scoped to the current browser tab**. Tokens are automatically cleared when the tab or window is closed.

## Part of swr-login

See the full project at [github.com/tobytovi/swr-login](https://github.com/tobytovi/swr-login).

## License

[MIT](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
