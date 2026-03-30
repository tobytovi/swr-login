import { generateRandomString } from '../utils';

const CSRF_STORAGE_PREFIX = '__swr_login_csrf_';

/**
 * Generate a random CSRF state parameter and store it in sessionStorage.
 *
 * @param key - Optional custom key suffix for the storage entry
 * @returns The generated state string
 *
 * @example
 * ```ts
 * const state = generateCSRFState('google');
 * // Include state in OAuth authorization URL
 * const authUrl = `${authorizeEndpoint}?state=${state}&...`;
 * ```
 */
export function generateCSRFState(key = 'default'): string {
  const state = generateRandomString(32);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(`${CSRF_STORAGE_PREFIX}${key}`, state);
  }
  return state;
}

/**
 * Validate a CSRF state parameter against the stored value.
 * The stored value is consumed (deleted) after validation.
 *
 * @param state - The state parameter received in the callback
 * @param key - The key suffix used when generating the state
 * @returns `true` if the state matches
 */
export function validateCSRFState(state: string, key = 'default'): boolean {
  if (typeof sessionStorage === 'undefined') return false;

  const storageKey = `${CSRF_STORAGE_PREFIX}${key}`;
  const storedState = sessionStorage.getItem(storageKey);

  if (storedState) {
    sessionStorage.removeItem(storageKey);
  }

  return storedState !== null && storedState === state;
}

/**
 * Clear all stored CSRF states.
 */
export function clearCSRFStates(): void {
  if (typeof sessionStorage === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CSRF_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    sessionStorage.removeItem(key);
  }
}
