/**
 * @swr-login/react - useLoginMethods (v0.9).
 *
 * Returns the registered methods optionally filtered by slot / enabled flag.
 * Pure read — does NOT trigger re-renders (methods array identity is stable
 * within the registry).
 */

import type { LoginMethod } from '@swr-login/core';
import { isMethodEnabled, slotMatches } from '@swr-login/core';
import { useMemo } from 'react';
import { useAuthRegistryContext } from '../context';

export interface UseLoginMethodsFilter {
  slot?: string;
  enabledOnly?: boolean;
}

export function useLoginMethods(filter?: UseLoginMethodsFilter): LoginMethod[] {
  const { registry } = useAuthRegistryContext();
  const slot = filter?.slot;
  const enabledOnly = filter?.enabledOnly;

  return useMemo(() => {
    return registry.methods.filter((m) => {
      if (slot && !slotMatches(m.meta, slot)) return false;
      if (enabledOnly && !isMethodEnabled(m.meta)) return false;
      return true;
    });
  }, [registry, slot, enabledOnly]);
}
