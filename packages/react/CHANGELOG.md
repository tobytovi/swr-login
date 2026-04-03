# @swr-login/react

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
