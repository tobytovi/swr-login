import type { LoginErrorPhase, SWRLoginConfig, TranslateLoginErrorFn } from '@swr-login/core';
import { LoginRejection } from '@swr-login/core';

/**
 * Internal marker key. We attach this as a non-enumerable property on a
 * `LoginRejection` once the library has consumed it once, so that the
 * downstream SWR effect can detect "already handled" and skip
 * `onFetchUserError` (avoiding double-handling).
 *
 * The property is non-enumerable to keep the rejection serialisable into
 * SWR's error cache without the marker leaking into JSON output.
 */
const TRANSLATED_MARKER = '__swrLoginTranslated';

/**
 * Whether this error has already been processed by the translator pipeline.
 * Used by `useUser`'s SWR-error effect to avoid invoking
 * `onFetchUserError` for a `LoginRejection` that was already translated
 * inside the `login()` flow.
 */
export function isTranslated(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>)[TRANSLATED_MARKER] === true
  );
}

/**
 * Mark a `LoginRejection` as translated. Idempotent.
 */
export function markTranslated(err: LoginRejection): void {
  // Defensive: only set once. `Object.defineProperty` would throw on a
  // frozen object; since `LoginRejection` is not frozen this is safe.
  if (isTranslated(err)) return;
  try {
    Object.defineProperty(err, TRANSLATED_MARKER, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: true,
    });
  } catch {
    // If the rejection is somehow non-extensible, fall back to a plain
    // assignment. Worst case: the marker becomes enumerable, which is
    // harmless for runtime behaviour.
    (err as unknown as Record<string, unknown>)[TRANSLATED_MARKER] = true;
  }
}

/**
 * Run the user-supplied `translateLoginError`, isolating it from runtime
 * crashes.
 *
 * Contract:
 * - Returns the produced `LoginRejection` (already marked as translated)
 *   when the translator recognises the error.
 * - Returns `null` when there is no translator, the translator returns
 *   `null`/`undefined`, or the translator itself throws (the thrown
 *   exception is logged via `console.error` and silently swallowed so a
 *   buggy translator can never break the login pipeline).
 */
export function tryTranslateLoginError(
  translate: TranslateLoginErrorFn | undefined,
  error: unknown,
  phase: LoginErrorPhase,
  loginContext: unknown,
  pluginName: string | undefined,
): LoginRejection | null {
  if (!translate) return null;
  let result: ReturnType<TranslateLoginErrorFn>;
  try {
    result = translate(error, { phase, loginContext, pluginName });
  } catch (translatorErr) {
    // A throwing translator must never crash login. Log loudly so the
    // implementer notices, and fall back to the legacy path.
    // eslint-disable-next-line no-console
    console.error(
      '[swr-login] translateLoginError threw — falling back to legacy error path.',
      translatorErr,
    );
    return null;
  }
  if (!(result instanceof LoginRejection)) return null;
  markTranslated(result);
  return result;
}

/**
 * Convenience helper: pull `translateLoginError` off the runtime config in a
 * type-safe way without forcing every call site to re-cast.
 */
export function getTranslator(config: Partial<SWRLoginConfig>): TranslateLoginErrorFn | undefined {
  return config.translateLoginError;
}
