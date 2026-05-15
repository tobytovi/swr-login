# @swr-login/testing

## 0.1.0

### Minor Changes

- ## @swr-login/testing v0.9.0-alpha.0 — New Package

  New conformance test suite for `swr-login` v0.9 method authors.

  ### Features

  - `testLoginMethod(method, options)` — runs a standard conformance test suite against any `LoginMethod`
  - `createMockCredential()` — creates an in-memory `Credential` implementation for tests
  - Internally renders `<AuthHookRegistry>` with the target method via `@testing-library/react`
  - Validates: `submit`, `reset`, `cancel`, `errorHandling`, `onRegistryMount` idempotency

  ### Usage

  ```ts
  import { testLoginMethod, createMockCredential } from "@swr-login/testing";
  import { myMethod } from "../src/method";

  testLoginMethod(myMethod, {
    mockCredential: createMockCredential(),
    testSubmit: async (handle) => {
      await handle.submit!({ token: "mock-token" });
      expect(handle.state).toBe("success");
    },
    testReset: async (handle) => {
      handle.reset();
      expect(handle.state).toBe("idle");
      expect(handle.error).toBeUndefined();
    },
    testOnRegistryMount: async (method) => {
      // Verify idempotency: calling onRegistryMount twice should not double-process
    },
  });
  ```

  ### Peer dependencies

  - `vitest` (or any test runner compatible with the standard `describe`/`it`/`expect` globals)
  - `@testing-library/react`
  - `react >= 18`

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @swr-login/core@0.13.0
  - @swr-login/react@0.14.0
