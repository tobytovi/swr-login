# swr-login

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
