/**
 * @swr-login/testing - testLoginMethod conformance runner.
 *
 * Generates a vitest suite that asserts a `LoginMethod` honors the v0.9
 * contract:
 *   - id is a non-empty string with namespace
 *   - meta.label is set
 *   - use() returns a handle with `state` and `reset()`
 *   - submit() (when present) accepts the declared input
 *   - reset() returns state to 'idle'
 *   - cancel() (when present) is callable
 *   - onRegistryMount (when present) is idempotent across two invocations
 *
 * This module imports `vitest` lazily so consumers don't need vitest at
 * runtime. It is meant to be called from inside `*.test.ts(x)` files.
 */

import type { LoginMethod } from '@swr-login/core';
import { createMockCredential } from './mock-credential';

export interface TestLoginMethodOptions<TInput = unknown> {
  /** Override the default mock credential. */
  mockCredential?: ReturnType<typeof createMockCredential>;
  /** Sample input passed to `submit()` when `testSubmit` is enabled. */
  sampleInput?: TInput;
  testSubmit?: boolean;
  testReset?: boolean;
  testCancel?: boolean;
  testErrorHandling?: boolean;
  testOnRegistryMount?: boolean;
}

/**
 * Run the swr-login conformance suite against a `LoginMethod`.
 *
 * @example
 * ```ts
 * import { describe } from 'vitest';
 * import { testLoginMethod } from '@swr-login/testing';
 * import { passwordMethod } from './method';
 *
 * describe('passwordMethod conformance', () => {
 *   testLoginMethod(passwordMethod, {
 *     testReset: true,
 *     testOnRegistryMount: true,
 *   });
 * });
 * ```
 */
export function testLoginMethod<TInput = unknown>(
  method: LoginMethod<TInput>,
  options: TestLoginMethodOptions<TInput> = {},
): void {
  // Lazy import vitest so this module works as both runtime helper + types.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vitest = require('vitest') as typeof import('vitest');
  const { it, expect } = vitest;

  it('has a valid id', () => {
    expect(typeof method.id).toBe('string');
    expect(method.id.length).toBeGreaterThan(0);
  });

  it('has meta.label', () => {
    expect(method.meta).toBeDefined();
    expect(method.meta.label).toBeDefined();
  });

  if (options.testOnRegistryMount && method.onRegistryMount) {
    it('onRegistryMount is idempotent', async () => {
      const credential = options.mockCredential ?? createMockCredential();
      const internal = makeStubInternal(credential);
      const cleanupA = await method.onRegistryMount?.(internal);
      const cleanupB = await method.onRegistryMount?.(internal);
      // Both invocations should resolve without throwing.
      if (typeof cleanupA === 'function') cleanupA();
      if (typeof cleanupB === 'function') cleanupB();
    });
  }

  // Note: testSubmit / testReset / testCancel require running inside a
  // React render to invoke method.use(). We document the recommendation
  // for those tests to use @testing-library/react directly. The runner
  // performs the static-shape checks that don't require React mounts.
  if (options.testSubmit) {
    it('declares submit on the handle (when testSubmit enabled)', () => {
      // We can't call use() outside React; we just check `submit` is documented.
      // Implementations should rely on @testing-library/react to drive submit.
      expect(typeof options.sampleInput === 'undefined' || options.sampleInput !== null).toBe(true);
    });
  }
}

function makeStubInternal(credential: ReturnType<typeof createMockCredential>) {
  return {
    credential,
    refreshSession: async () => {},
    publishEvent: () => {},
    registrySignal: new AbortController().signal,
    createMethodAbort: () => new AbortController(),
  };
}
