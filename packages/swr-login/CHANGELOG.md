# swr-login

## 0.9.0

### Minor Changes

- **BREAKING**: This is a pre-release alpha for v1.0.0. See [MIGRATION.md](./MIGRATION.md).

  ## swr-login v0.9.0-alpha.0 — Sub-path Export Rename

  ### Breaking Changes

  - **Removed**: `swr-login/plugins/password` → use `swr-login/methods/password`
  - **Removed**: `swr-login/plugins/oauth-github` → use `swr-login/methods/oauth-github`
  - **Removed**: `swr-login/plugins/oauth-google` → use `swr-login/methods/oauth-google`
  - **Removed**: `swr-login/plugins/oauth-wechat` → use `swr-login/methods/oauth-wechat`
  - **Removed**: `swr-login/plugins/passkey` → use `swr-login/methods/passkey`
  - **Removed**: `swr-login/presets` — no longer needed (methods replace presets)
  - **Removed**: `swr` peer dependency

  ### New Exports

  - **Added**: `swr-login/methods/password`
  - **Added**: `swr-login/methods/mock`
  - **Added**: `swr-login/methods/oauth-github`
  - **Added**: `swr-login/methods/oauth-google`
  - **Added**: `swr-login/methods/oauth-wechat`
  - **Added**: `swr-login/methods/passkey`
  - **Updated**: All v0.9 core + react APIs re-exported from the main `swr-login` entry

  ### Migration

  ```ts
  // v0.7
  import { PasswordPlugin } from "swr-login/plugins/password";

  // v0.9
  import {
    createPasswordMethod,
    passwordMethod,
  } from "swr-login/methods/password";
  ```

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @swr-login/core@0.13.0
  - @swr-login/react@0.14.0

## 0.7.1

### Patch Changes

- Updated dependencies
  - @swr-login/react@0.13.0

## 0.7.0

### Minor Changes

- Add `translateLoginError` — a unified login-error translation hook.

  A single user-supplied function now intercepts every error raised in the
  login pipeline (`plugin_login` / `after_auth` / `fetch_user`) **and** errors
  from SWR background revalidation (`revalidate`), giving callers one place to
  collapse "error code × business variant → user-facing message" matrices that
  previously had to be duplicated across `onPreReset`, `afterAuth`,
  `LoginForm.catch`, and `onFetchUserError`.

  When the translator returns a new `LoginRejection`, the library:

  - Clears tokens via the configured `TokenManager`
  - Transitions the state machine to `unauthenticated`
  - Skips `onFetchUserError` for that error (no double-handling)
  - Rejects `login()` with the `LoginRejection` as-is (no further wrapping)
  - Exposes the same `LoginRejection` via `useUser().lastError`

  Returning `null`/`undefined` falls back to the existing error path, so the
  change is **fully backward compatible** — existing `onFetchUserError`-only
  configurations behave exactly as before.

  New exports:

  - `LoginRejection` (class, with `LoginRejection.is` type guard)
  - `LoginErrorPhase`, `TranslateLoginErrorContext`, `TranslateLoginErrorFn` (types)
  - `SWRLoginConfig.translateLoginError` (optional config field)

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.12.0
  - @swr-login/react@0.12.0

## 0.6.0

### Minor Changes

- feat: `afterAuth` 和 `fetchUser` 新增 `loginContext` 支持

  `AfterAuthContext` 新增 `loginContext` 字段，`SWRLoginConfig.fetchUser` 签名从 `(token: string)` 改为接收上下文对象 `({ token, loginContext })`。

  两个钩子现在均可感知 `useLogin().login(credentials, { context })` 透传的业务上下文，无需在应用层维护模块级可变变量做桥接。

  **Breaking change for `fetchUser`**：如果你已配置 `fetchUser`，需将签名从 `(token) => ...` 更新为 `({ token }) => ...`。

  ```ts
  // 旧签名
  fetchUser: async (token) => {
    return fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
  };

  // 新签名
  fetchUser: async ({ token, loginContext }) => {
    const variant = (loginContext as { variant?: string })?.variant;
    return fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
  };
  ```

  ```ts
  // afterAuth 现在可以读取 loginContext
  afterAuth: async ({ loginContext, skipFetchUser }) => {
    const variant = (loginContext as { variant?: string })?.variant;
    if (variant === 'student') return; // 学生入口跳过 adminCheckAuth
    // ...
  },
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.11.0
  - @swr-login/react@0.11.0

## 0.5.0

### Minor Changes

- 新增：`useLogin().login()` 与 `pluginManager.login()` 支持 `options.context` 参数，用于将业务侧上下文透传给插件。

  ## 动机

  业务侧在调用 `login()` 时，常常需要把"本次调用从哪触发"的元信息（例如学生入口 vs 教师入口）传递给插件中的钩子（例如 `coding-auth-password` 的 `onPreReset`）。在此之前，业务侧只能通过模块级可变变量来传递，存在隐式契约、并发不安全、跨模块耦合等问题。

  ## 改动

  - `@swr-login/core`

    - 新增导出类型 `LoginCallOptions`（`{ context?: unknown }`）。
    - `PluginContext` 新增可选字段 `loginContext?: unknown`，由 `PluginManager.login(name, creds, { context })` 在调用插件 `login()` 时设置。
    - `PluginManager.login(name, creds, options?)` 新增第三个可选参数。

  - `@swr-login/react`
    - `useLogin().login()` 新增可选 `options` 参数，两种调用形式都支持：
      - `login(creds, options?)`（`useLogin('plugin-name')` 预设场景）
      - `login(pluginName, creds?, options?)`（动态指定插件场景）

  ## 兼容性

  - 完全向后兼容：现有调用 `login(creds)` / `login(name, creds)` 的代码不需要修改。
  - 不传 `options` 时，`ctx.loginContext` 为 `undefined`，与历史行为一致。
  - 库不解释 `context` 的具体内容（类型为 `unknown`），由业务侧自行断言。

  ## 示例

  ```ts
  // 调用方
  const { login } = useLogin('coding-password');
  await login({ account, password }, { context: { variant: 'teacher' } });

  // 插件 / 钩子方（如 coding-auth-password 的 onPreReset）
  async login(creds, ctx) {
    const variant = (ctx.loginContext as { variant?: string })?.variant;
    // ...
  }
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.10.0
  - @swr-login/react@0.10.0

## 0.4.3

### Patch Changes

- chore(swr-login): 跟随 @swr-login/react@0.9.3 同步 patch 版本

  包含修复：`useUser` hint 优先级修正（首屏立即登录被错误识别为 `initial` 的问题）。

## 0.4.2

### Patch Changes

- Updated dependencies
  - @swr-login/react@0.9.3

## 0.4.1

### Patch Changes

- Updated dependencies
  - @swr-login/react@0.9.2

## 0.4.0

### Minor Changes

- feat: export UserChangeEvent / UserChangeSource from @swr-login/core barrel; re-export useUserChange, useUserChangeEffect, useUserChangeOn and related types from umbrella swr-login package

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.9.0
  - @swr-login/react@0.9.1

## 0.3.0

### Minor Changes

- feat: add UserChangeSource / UserChangeEvent and user-change hooks

  New APIs to observe _why_ the user value changed, not just _that_ it changed.

  **`@swr-login/core`**

  - New type `UserChangeSource` — discriminated union: `'initial' | 'login' | 'logout' | 'revalidate' | 'external'`
  - New type `UserChangeEvent<T>` — full transition payload with `source`, `user`, `previousUser`, `timestamp`
  - `AuthEventMap` extended with `'user-change': UserChangeEvent` — subscribe via `emitter.on('user-change', cb)`

  **`@swr-login/react`**

  - `useUser()` return value extended with `lastChangeSource: UserChangeSource | null` and `lastChangeEvent: UserChangeEvent<T> | null`
  - New hook `useUserChange<T>()` — discrete event stream, re-renders on each transition
  - New hook `useUserChangeEffect(cb)` — side-effect callback, no re-render; listener ref always up-to-date (no `useCallback` needed)
  - New hook `useUserChangeOn(source | source[], cb)` — filtered variant of `useUserChangeEffect`

  All 5 sources are handled automatically:

  - `initial` — first `fetchUser` resolution on mount
  - `login` / `logout` — Provider subscribes to emitter events and writes a TTL hint
  - `external` — cross-tab BroadcastChannel sync marks hint as `external`
  - `revalidate` — any other SWR cache change

  Fully backward-compatible: no existing API changed.

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.8.0
  - @swr-login/react@0.9.0

## 0.2.8

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.7.0
  - @swr-login/react@0.8.0

## 0.2.7

### Patch Changes

- Updated dependencies
  - @swr-login/react@0.7.0

## 0.2.6

### Patch Changes

- fix: add missing `useAdapter` and `UseAdapterReturn` re-exports from `@swr-login/react`

  The umbrella package was missing the re-export of `useAdapter` hook and `UseAdapterReturn` type
  that were added in `@swr-login/react@0.6.0`. Consumers using `import { useAdapter } from 'swr-login'`
  would get a module-not-found error. This patch adds the missing re-exports.

## 0.2.5

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.6.0
  - @swr-login/react@0.6.0

## 0.2.4

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.5.0
  - @swr-login/react@0.5.0

## 0.2.3

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.4.0
  - @swr-login/react@0.4.0

## 0.2.2

### Patch Changes

- fix: 补全聚合包遗漏的多步骤登录相关导出

  - 新增值导出：`useMultiStepLogin`、`useAuthInjector`、`isMultiStepPlugin`
  - 新增类型导出：`UseMultiStepLoginReturn`、`LoginStep`、`MultiStepLoginPlugin`、`AuthInjector`
  - 修复消费方 `import { useMultiStepLogin } from 'swr-login'` 报 "Export doesn't exist" 的问题

## 0.2.1

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.3.0
  - @swr-login/react@0.3.0

## 0.2.0

### Minor Changes

- 89e7b90: Publish all packages to npm.

  - `@swr-login/react`: First publish — React bindings (Provider, Hooks, AuthGuard)
  - `swr-login`: First publish — Unified entry package re-exporting core + react + presets
  - All adapter and plugin packages: First publish

### Patch Changes

- Updated dependencies [89e7b90]
  - @swr-login/core@0.2.0
  - @swr-login/react@0.2.0
