# swr-login

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
