/**
 * @swr-login/react - MethodSlot (v0.9 internal).
 *
 * Always invokes `method.use()` regardless of `enabled` / `visible` state.
 * This is REQUIRED to keep React's Hook order stable across re-renders.
 *
 * The handle returned by `use()` is published into a shared `handlesRef`
 * map keyed by `method.id`, so that `useLoginMethod(id)` can pick it up
 * via `useSyncExternalStore`-driven re-renders.
 */

import type { LoginMethod } from '@swr-login/core';
import { memo, useEffect } from 'react';
import { useAuthRegistryContext } from '../context';

interface MethodSlotProps {
  method: LoginMethod;
  /**
   * Bumped by `<MethodSlotList>` whenever any method handle changes, to
   * trigger a `useLoginMethod` re-render.
   */
  notifyHandlesChange: () => void;
}

function MethodSlotInner({ method, notifyHandlesChange }: MethodSlotProps) {
  const { handlesRef, methodCallDepthRef } = useAuthRegistryContext();

  // Invoke method.use() under depth-tracking so useAuthInternal() can
  // detect "called outside method.use()" misuse in dev mode.
  methodCallDepthRef.current += 1;
  let handle: unknown;
  try {
    handle = method.use();
  } finally {
    methodCallDepthRef.current -= 1;
  }

  // Publish the handle into the shared map. We do this in render (not in
  // useEffect) because `useLoginMethod` may be called in the same render
  // pass on a sibling component.
  if (handlesRef.current) {
    handlesRef.current.set(method.id, handle);
  }

  // Notify subscribers in an effect to coalesce within React's batch.
  useEffect(() => {
    notifyHandlesChange();
  });

  // MethodSlot does not render UI itself; the public `Slot` component
  // (or business code) consumes handles via `useLoginMethod` / `useLoginMethods`.
  return null;
}

export const MethodSlot = memo(MethodSlotInner, (prev, next) => prev.method === next.method);
MethodSlot.displayName = 'MethodSlot';
