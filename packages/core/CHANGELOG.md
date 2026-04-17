# @swr-login/core

## 0.9.0

### Minor Changes

- feat: export UserChangeEvent / UserChangeSource from @swr-login/core barrel; re-export useUserChange, useUserChangeEffect, useUserChangeOn and related types from umbrella swr-login package

## 0.8.0

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

## 0.7.0

### Minor Changes

- feat: add `swrOptions` to SWRLoginConfig for consumer-configurable SWR behavior

  Added a new optional `swrOptions` field to `SWRLoginConfig` that allows consumers to customize SWR revalidation behavior in `useUser()` without wrapping in a separate `SWRConfig`.

  Exposed options: `revalidateOnFocus`, `revalidateOnReconnect`, `dedupingInterval`, `focusThrottleInterval`, `refreshInterval`.

  Previously, `useUser()` hardcoded `revalidateOnFocus: true` which could not be overridden by consumers. Now consumers can disable it via:

  ```ts
  createAuthConfig({
    swrOptions: { revalidateOnFocus: false },
  });
  ```

## 0.6.0

### Minor Changes

- feat: add `TokenAdapter.hasAuth()` optional method and `useAdapter()` hook

  - `TokenAdapter` interface gains an optional `hasAuth?(): boolean` method for synchronous auth-state checks
  - New `useAdapter()` React hook exposes `hasAuth()` (with fallback to `getAccessToken() !== null`) and the raw `adapter` reference
  - Enables homepage auto-redirect patterns without waiting for SWR revalidation

## 0.5.0

### Minor Changes

- 新增 `afterAuth` 钩子，支持在 plugin 登录成功后、`fetchUser` 调用前执行自定义逻辑。

  - `@swr-login/core`：新增 `AfterAuthContext` 接口，`SWRLoginConfig` 新增 `afterAuth` 可选配置项
  - `@swr-login/react`：`useLogin` 在 `pluginManager.login()` 成功后插入 `afterAuth` 钩子调用，支持通过 `skipFetchUser()` 跳过后续 fetchUser，或通过抛出错误回滚 token

## 0.4.0

### Minor Changes

- 新增 fetchUser 错误处理机制：

  - `SWRLoginConfig` 新增 `validateUserOnLogin`（默认 true）：login 成功后自动调用 `fetchUser` 验证用户状态，失败则回滚 token 并 reject
  - `SWRLoginConfig` 新增 `onFetchUserError`：`fetchUser` 抛出错误时的回调，支持返回 `'retry'` / `'logout'` / `'ignore'` 三种策略
  - `useUser` 返回值新增 `lastError`：持久化保存最近一次 `fetchUser` 失败的错误，不随状态切换清除
  - `useUser` 返回值新增 `clearError()`：手动重置 `lastError`

## 0.3.0

### Minor Changes

- feat: add MultiStepPlugin support for multi-step login flows

  - New MultiStepLoginPlugin interface and LoginStep type definition
  - Extended PluginManager with getSteps(), executeStep(), finalizeMultiStep() methods
  - New useMultiStepLogin hook for step-by-step login state management
  - New useAuthInjector hook for injecting external auth state
  - New error classes: StepNotFoundError, StepValidationError, MultiStepFlowError

## 0.2.0

### Minor Changes

- 89e7b90: Publish all packages to npm.

  - `@swr-login/react`: First publish — React bindings (Provider, Hooks, AuthGuard)
  - `swr-login`: First publish — Unified entry package re-exporting core + react + presets
  - All adapter and plugin packages: First publish
