# @swr-login/adapter-session

## 0.3.0

### Minor Changes

- **BREAKING**: This is a pre-release alpha for v1.0.0. See [MIGRATION.md](../../MIGRATION.md).

  ## Adapter Packages v0.9.0-alpha.0 — Credential v1.0 Interface

  All three adapter packages (`adapter-jwt`, `adapter-cookie`, `adapter-session`) now implement the
  new `Credential` v1.0 interface from `@swr-login/core`.

  ### Breaking Changes

  - **Removed**: `TokenAdapter` interface (v0.7) — replaced by `Credential`
  - **Removed**: `getToken()` / `setToken()` / `removeToken()` (v0.7)
  - **Removed**: SWR-related cache invalidation helpers
  - **Removed**: `swr` peer dependency

  ### New Interface

  ```ts
  interface Credential {
    readonly version: "1.0";
    hasAuth(): boolean; // Synchronous, no I/O
    clear(): Promise<void>; // Drop persisted credential
    getAccessToken?(): string | null; // Bearer token accessor
    subscribe(listener: () => void): () => void; // Cross-tab sync
    onExpire?: () => void; // Set by AuthHookRegistry; call in 401 interceptors
  }
  ```

  ### Per-adapter Changes

  - **`adapter-jwt`**: `JWTAdapter` → `createJWTCredential(options)`. Implements `subscribe` via
    `storage` events. `onExpire` is wired by `AuthHookRegistry`.
  - **`adapter-cookie`**: `CookieAdapter` → `createCookieCredential(options)`. `subscribe` listens
    to `focus` / `visibilitychange` events for cross-tab detection.
  - **`adapter-session`**: `SessionAdapter` → `createSessionCredential(options)`. Similar to JWT
    adapter but uses `sessionStorage`.

  ### Migration

  ```ts
  // v0.7
  import { JWTAdapter } from "@swr-login/adapter-jwt";
  const adapter = JWTAdapter({ storage: "localStorage" });

  // v0.9
  import { createJWTCredential } from "@swr-login/adapter-jwt";
  // or: import { createJWTCredential } from 'swr-login/adapters/jwt';
  const credential = createJWTCredential({ storage: "localStorage" });
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.13.0

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
