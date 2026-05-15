/**
 * @swr-login/react - useCredential (v0.9).
 *
 * Returns the Credential instance attached to the registry. Used by
 * HTTP-client interceptors for `Authorization: Bearer ${accessToken}`.
 */

import type { Credential } from '@swr-login/core';
import { useAuthRegistryContext } from '../context';

export function useCredential<C extends Credential = Credential>(): C {
  const { credential } = useAuthRegistryContext();
  return credential as C;
}
