# @swr-login/method-mock

## 1.0.0

### Minor Changes

- ## @swr-login/method-mock v0.9.0-alpha.0 — New Package

  New dev-only mock login method for `swr-login` v0.9.

  ### Features

  - `createMockMethod(config)` factory with `user`, `delay`, `shouldFail` options
  - `mockMethod` zero-config default instance (mocks a teacher user)
  - Method ID: `local/mock` (exempted from namespace enforcement)
  - Zero production dependencies; intended for `devDependencies`

  ### Usage

  ```ts
  import { createMockMethod } from '@swr-login/method-mock';
  // or: import { createMockMethod } from 'swr-login/methods/mock';

  const mockMethod = createMockMethod({
    user: { id: 'dev-user', name: 'Dev User', role: 'admin' },
    delay: 500,
  });

  <AuthHookRegistry methods={[passwordMethod, mockMethod]} ...>
  ```

  Conditionally include in dev:

  ```ts
  const METHODS = [
    passwordMethod,
    ...(process.env.NODE_ENV !== "production" ? [mockMethod] : []),
  ];
  ```

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @swr-login/core@0.13.0
  - @swr-login/react@0.14.0
  - swr-login@0.9.0
