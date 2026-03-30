import { base64urlEncode, generateRandomString, sha256 } from '../utils';

/** PKCE code pair for OAuth 2.0 Authorization Code flow */
export interface PKCECodePair {
  /** Random code verifier (43-128 chars) */
  codeVerifier: string;
  /** SHA-256 hash of code verifier, base64url encoded */
  codeChallenge: string;
  /** Always 'S256' */
  codeChallengeMethod: 'S256';
}

/**
 * Generate PKCE code pair for secure OAuth 2.0 flows (RFC 7636).
 *
 * @param length - Length of code verifier (default: 64, min: 43, max: 128)
 * @returns PKCE code pair with verifier, challenge, and method
 *
 * @example
 * ```ts
 * const { codeVerifier, codeChallenge } = await generatePKCE();
 * // Store codeVerifier in sessionStorage
 * // Send codeChallenge with authorization request
 * ```
 */
export async function generatePKCE(length = 64): Promise<PKCECodePair> {
  const clampedLength = Math.max(43, Math.min(128, length));
  const codeVerifier = generateRandomString(clampedLength);
  const hash = await sha256(codeVerifier);
  const codeChallenge = base64urlEncode(hash);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

const PKCE_STORAGE_KEY = '__swr_login_pkce_verifier__';

/**
 * Store PKCE code verifier in sessionStorage for callback validation.
 */
export function storePKCEVerifier(verifier: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
  }
}

/**
 * Retrieve and remove PKCE code verifier from sessionStorage.
 */
export function retrievePKCEVerifier(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const verifier = sessionStorage.getItem(PKCE_STORAGE_KEY);
  if (verifier) {
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
  }
  return verifier;
}
