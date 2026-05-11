# @swr-login/react

## 0.9.2

### Patch Changes

- fix(react): `useAuthInjector.injectAuth` 现在能从 `error` / `unauthenticated` 状态正常恢复到 `authenticated`

  ## 背景

  `useAuthInjector` 是 swr-login 的"逃生舱" hook，用于让外部登录流程
  （如多步骤登录、第三方 SDK 回调、密码重置后的会话恢复）将登录态注入回 swr-login 体系。

  ## 修复

  `injectAuth` 之前直接调用 `stateMachine.transition('authenticated')`，
  但状态机不允许 `error -> authenticated` / `unauthenticated -> authenticated`
  直接转换，导致以下场景：

  ```
  [swr-login] Invalid state transition: error -> authenticated
  ```

  最终用户会被 `AuthGuard` 误判为未登录、踢回首页。

  修复后 `injectAuth` 在检测到当前状态为 `error` 或 `unauthenticated` 时，
  会先 `transition('authenticating')` 中转一次（这是合法转换），
  再 `transition('authenticated')`。每一步都符合状态机契约，
  `injectAuth` 真正成为可在任意状态下完成恢复的逃生舱。

  ## 受影响场景

  - `@tencent/coding-auth-password` 的 `helpers.skipReset()` 调用后，
    业务侧用 `injectAuth(authResp)` 派发 `login` 事件以恢复登录态；
  - 其他在 `login()` reject 之后才完成的外部登录流程；
  - 多步骤登录中途出错后，从外部恢复登录态。

  ## 兼容性

  完全向后兼容。原本能直接成功的转换（`idle/authenticating/refreshing -> authenticated`）
  路径不变；仅修复了 `error` / `unauthenticated` 起点被状态机拒绝的 bug。

## 0.9.1

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.9.0

## 0.9.0

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

## 0.8.0

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

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.7.0

## 0.7.0

### Minor Changes

- fix: cookie-based adapter 外部登录态兼容

  - **useUser fetcher**: refresh 失败后，如果 token 仍然存在（如 cookie-based 场景），继续尝试 fetchUser 让服务端验证，而非直接返回 null
  - **SWRLoginProvider**: 初始化时，当 token 存在但 expiresAt 为 null（未知过期时间，如外部登录）时，乐观认证让 fetchUser/SWR revalidate 来验证

  修复了外部登录态（如通过主站设置 cookie）导致 hasAuth()=true 但 useUser()=null 的无限循环跳转问题。

## 0.6.0

### Minor Changes

- feat: add `TokenAdapter.hasAuth()` optional method and `useAdapter()` hook

  - `TokenAdapter` interface gains an optional `hasAuth?(): boolean` method for synchronous auth-state checks
  - New `useAdapter()` React hook exposes `hasAuth()` (with fallback to `getAccessToken() !== null`) and the raw `adapter` reference
  - Enables homepage auto-redirect patterns without waiting for SWR revalidation

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.6.0

## 0.5.0

### Minor Changes

- 新增 `afterAuth` 钩子，支持在 plugin 登录成功后、`fetchUser` 调用前执行自定义逻辑。

  - `@swr-login/core`：新增 `AfterAuthContext` 接口，`SWRLoginConfig` 新增 `afterAuth` 可选配置项
  - `@swr-login/react`：`useLogin` 在 `pluginManager.login()` 成功后插入 `afterAuth` 钩子调用，支持通过 `skipFetchUser()` 跳过后续 fetchUser，或通过抛出错误回滚 token

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.5.0

## 0.4.0

### Minor Changes

- 新增 fetchUser 错误处理机制：

  - `SWRLoginConfig` 新增 `validateUserOnLogin`（默认 true）：login 成功后自动调用 `fetchUser` 验证用户状态，失败则回滚 token 并 reject
  - `SWRLoginConfig` 新增 `onFetchUserError`：`fetchUser` 抛出错误时的回调，支持返回 `'retry'` / `'logout'` / `'ignore'` 三种策略
  - `useUser` 返回值新增 `lastError`：持久化保存最近一次 `fetchUser` 失败的错误，不随状态切换清除
  - `useUser` 返回值新增 `clearError()`：手动重置 `lastError`

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.4.0

## 0.3.0

### Minor Changes

- feat: add MultiStepPlugin support for multi-step login flows

  - New MultiStepLoginPlugin interface and LoginStep type definition
  - Extended PluginManager with getSteps(), executeStep(), finalizeMultiStep() methods
  - New useMultiStepLogin hook for step-by-step login state management
  - New useAuthInjector hook for injecting external auth state
  - New error classes: StepNotFoundError, StepValidationError, MultiStepFlowError

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
