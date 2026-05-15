# @swr-login/plugin-password

## 1.0.0

### Minor Changes

- **BREAKING**: This is a pre-release alpha for v1.0.0. See [MIGRATION.md](../../MIGRATION.md).

  ## Method Packages v0.9.0-alpha.0 — Renamed from Plugin-\* + Plugin-as-Hook Rewrite

  These packages are renamed from `@swr-login/plugin-*` to `@swr-login/method-*` and completely
  rewritten to implement the `LoginMethod<TInput, TResult, THandle>` contract.

  ### Package Renames

  | v0.7 Package                     | v0.9 Package                     |
  | -------------------------------- | -------------------------------- |
  | `@swr-login/plugin-password`     | `@swr-login/method-password`     |
  | `@swr-login/plugin-oauth-github` | `@swr-login/method-oauth-github` |
  | `@swr-login/plugin-oauth-google` | `@swr-login/method-oauth-google` |
  | `@swr-login/plugin-oauth-wechat` | `@swr-login/method-oauth-wechat` |
  | `@swr-login/plugin-passkey`      | `@swr-login/method-passkey`      |

  ### Breaking Changes per Package

  All packages:

  - **Removed**: `XxxPlugin(config)` factory (v0.7 SWRLoginPlugin interface)
  - **Added**: `createXxxMethod(config)` factory (LoginMethod interface)
  - **Added**: `xxxMethod` zero-config default instance
  - **Added**: `package.json#swr-login` metadata block (`methodId`, `methodVersion`, `category`, `compilerCompat`)

  #### `@swr-login/method-password`

  - Method ID: `swr-login/password`
  - Handle: `PasswordHandle` extends `BaseLoginMethodHandle` (no extra fields in v0.9.0-alpha.0)
  - Config: `loginUrl`, `fetchOptions`, `transformResponse`, `translateError`, `label`, `slot`, `order`

  #### `@swr-login/method-oauth-github` / `method-oauth-google`

  - Method ID: `swr-login/oauth-github` / `swr-login/oauth-google`
  - Handle: `GitHubOAuthHandle` / `GoogleOAuthHandle` with `redirect()` method
  - `onRegistryMount` handles `?code=&state=` callback, exchanges for token, cleans URL

  #### `@swr-login/method-oauth-wechat`

  - Method ID: `swr-login/oauth-wechat`
  - Handle: `WeChatOAuthHandle` with `redirect()` method
  - `onRegistryMount` handles WeChat `?code=` callback

  #### `@swr-login/method-passkey`

  - Method ID: `swr-login/passkey`
  - Handle: `PasskeyHandle` with WebAuthn `navigator.credentials.get/create`
  - `submit({})` triggers authentication flow

  ### Migration

  ```ts
  // v0.7
  import { PasswordPlugin } from "@swr-login/plugin-password";
  plugins: [PasswordPlugin({ loginUrl: "/api/login" })];

  // v0.9
  import { createPasswordMethod } from "@swr-login/method-password";
  methods: [createPasswordMethod({ loginUrl: "/api/login" })];
  ```

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @swr-login/core@0.13.0
  - @swr-login/react@0.14.0
  - swr-login@0.9.0

## 0.2.10

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.12.0

## 0.2.9

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.11.0

## 0.2.8

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.10.0

## 0.2.7

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.9.0

## 0.2.6

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.8.0

## 0.2.5

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.7.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.6.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.3.0

## 0.2.0

### Minor Changes

- 89e7b90: Publish all packages to npm.

  - `@swr-login/react`: First publish — React bindings (Provider, Hooks, AuthGuard)
  - `swr-login`: First publish — Unified entry package re-exporting core + react + presets
  - All adapter and plugin packages: First publish

### Patch Changes

- Updated dependencies [89e7b90]
  - @swr-login/core@0.2.0
