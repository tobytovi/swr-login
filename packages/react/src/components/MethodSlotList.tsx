/**
 * @swr-login/react - MethodSlotList (v0.9 internal).
 *
 * Renders one `<MethodSlot>` per method in declaration order. The list itself
 * is rendered **invisibly** (returns null) — its only purpose is to invoke
 * `method.use()` for every registered method so React Hook order is stable.
 *
 * Owns the simple subscription model that drives `useLoginMethod`:
 *   - an internal `version` counter bumped on each handles-map mutation
 *   - a `Set<listener>` notified after each render
 */

import type { LoginMethod } from '@swr-login/core';
import { useCallback, useEffect, useRef } from 'react';
import { MethodSlot } from './MethodSlot';

interface MethodSlotListProps {
  methods: readonly LoginMethod[];
  /** Called once after each render when handles map may have changed. */
  onHandlesChange: () => void;
}

export function MethodSlotList({ methods, onHandlesChange }: MethodSlotListProps) {
  const notifyRef = useRef(onHandlesChange);
  notifyRef.current = onHandlesChange;

  const notifyHandlesChange = useCallback(() => {
    notifyRef.current?.();
  }, []);

  // Re-emit notify if methods list reference changes (defensive).
  useEffect(() => {
    notifyRef.current?.();
  }, []);

  return (
    <>
      {methods.map((m) => (
        <MethodSlot key={m.id} method={m} notifyHandlesChange={notifyHandlesChange} />
      ))}
    </>
  );
}
