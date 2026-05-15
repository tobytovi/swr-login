/**
 * @swr-login/core - Method registry (v0.9).
 *
 * Replaces v0.7's `PluginManager`. Responsibilities:
 *   - id uniqueness (throws `DuplicateMethodIdError`)
 *   - id namespace validation (`scope/name`, with `local/` and `test/` exempt)
 *   - dev-mode id-set stability check
 *   - lookup by id and slot
 *
 * The registry is **derived** from the React `methods` prop on every render
 * (cheap because just a Map build). All scheduling (`onRegistryMount`) happens
 * at the React layer.
 */

import { DuplicateMethodIdError } from './errors';
import type { LoginMethod, LoginMethodMeta } from './types';

const ID_NAMESPACE_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/i;
const NAMESPACE_EXEMPT_PREFIXES = ['local/', 'test/'];

// Avoid depending on @types/node for process.env detection
const isDev = (() => {
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return typeof proc !== 'undefined' && proc.env?.NODE_ENV !== 'production';
})();

/** Validate a method id. Throws on duplicate; warns on invalid namespace (dev). */
export function validateMethodId(id: string, seen?: Set<string>): void {
  if (seen) {
    if (seen.has(id)) {
      throw new DuplicateMethodIdError(id);
    }
    seen.add(id);
  }

  if (!isDev) return;

  const exempt = NAMESPACE_EXEMPT_PREFIXES.some((p) => id.startsWith(p));
  if (exempt) return;
  if (!ID_NAMESPACE_RE.test(id)) {
    console.error(
      `[swr-login] LoginMethod id "${id}" should follow "scope/name" namespace (use "local/*" or "test/*" prefix for private methods).`,
    );
  }
}

/**
 * Build a method registry view from the methods array.
 *
 * @throws DuplicateMethodIdError when two methods share the same id.
 */
export function buildMethodRegistry(methods: readonly LoginMethod[]): MethodRegistry {
  const byId = new Map<string, LoginMethod>();
  const seen = new Set<string>();
  for (const method of methods) {
    validateMethodId(method.id, seen);
    byId.set(method.id, method);
  }
  return new MethodRegistry(methods, byId);
}

/**
 * Read-only registry view exposed to React layer + hooks.
 */
export class MethodRegistry {
  constructor(
    public readonly methods: readonly LoginMethod[],
    private readonly byId: ReadonlyMap<string, LoginMethod>,
  ) {}

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): LoginMethod | undefined {
    return this.byId.get(id);
  }

  /** All ids in declaration order (stable under same `methods` array). */
  ids(): string[] {
    return this.methods.map((m) => m.id);
  }

  /** Filter by slot name (matches both string and string[] meta.slot). */
  bySlot(name: string): LoginMethod[] {
    return this.methods.filter((m) => slotMatches(m.meta, name));
  }

  /** Methods whose `meta.enabled` evaluates truthy (lazy invocation). */
  enabledOnly(): LoginMethod[] {
    return this.methods.filter((m) => isMethodEnabled(m.meta));
  }
}

export function slotMatches(meta: LoginMethodMeta, name: string): boolean {
  const s = meta.slot;
  if (!s) return false;
  if (typeof s === 'string') return s === name;
  return s.includes(name);
}

export function isMethodEnabled(meta: LoginMethodMeta): boolean {
  if (meta.enabled === undefined) return true;
  if (typeof meta.enabled === 'function') {
    try {
      return Boolean(meta.enabled());
    } catch {
      return false;
    }
  }
  return Boolean(meta.enabled);
}

/**
 * Dev-mode helper: warn when the id-set changes between renders.
 *
 * Caller must keep a ref to the previous snapshot and pass it in.
 */
export function checkIdSetStability(prev: readonly string[] | null, next: readonly string[]): void {
  if (!isDev || !prev) return;
  if (prev.length !== next.length || prev.some((id, i) => id !== next[i])) {
    console.error(
      `[swr-login] \`methods\` prop id set changed between renders. This breaks Hook order stability and may cause subtle bugs.\n  prev: [${prev.join(', ')}]\n  next: [${next.join(', ')}]`,
    );
  }
}
