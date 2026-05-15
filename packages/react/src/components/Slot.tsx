/**
 * @swr-login/react - Slot (v0.9 public).
 *
 * Headless render-prop that resolves all enabled methods in a named slot
 * and hands them to the consumer for rendering.
 *
 * @example
 * ```tsx
 * <Slot name="primary">
 *   {(methods) => methods.map((m) => <MyButton key={m.id} method={m} />)}
 * </Slot>
 * ```
 */

import type { LoginMethod } from '@swr-login/core';
import type { ReactNode } from 'react';
import { useLoginMethods } from '../hooks/useLoginMethods';

export interface SlotProps {
  name: string;
  children: (methods: LoginMethod[]) => ReactNode;
}

export function Slot({ name, children }: SlotProps) {
  const methods = useLoginMethods({ slot: name, enabledOnly: true });
  return <>{children(methods)}</>;
}
