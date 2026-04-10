# @swr-login/react

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
