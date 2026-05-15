/**
 * @swr-login/core - Config typing helper (v0.9).
 *
 * Pure identity function with strong inference. Lets users author the
 * `<AuthHookRegistry>` props as a typed object and reuse across files.
 */

import type { AuthHookRegistryProps } from './types';

/**
 * Identity helper for typing `AuthHookRegistry` props.
 *
 * @example
 * ```ts
 * export const authConfig = createAuthConfig({
 *   credential: cookieCredential,
 *   methods: [passwordMethod, githubMethod],
 *   fetchSession: fetchUser,
 * });
 *
 * <AuthHookRegistry {...authConfig}>
 *   <App />
 * </AuthHookRegistry>
 * ```
 */
export function createAuthConfig<P extends Omit<AuthHookRegistryProps, 'children'>>(config: P): P {
  return config;
}
