/**
 * Generate a cryptographically secure random string.
 * Uses Web Crypto API when available, falls back to Math.random.
 */
export function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (byte) => charset[byte % charset.length]).join('');
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

/**
 * Base64url encode a buffer (RFC 7636).
 */
export function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * SHA-256 hash using Web Crypto API.
 */
export async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.digest('SHA-256', encoder.encode(input));
}

/**
 * Check if a token expiration timestamp has passed.
 * Includes a 30-second buffer to account for clock skew.
 */
export function isTokenExpired(expiresAt: number | null, bufferMs = 30_000): boolean {
  if (expiresAt === null) return true;
  return Date.now() + bufferMs >= expiresAt;
}

/**
 * Generate a unique tab identifier.
 */
export function generateTabId(): string {
  return `tab_${Date.now()}_${generateRandomString(8)}`;
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * No-op function for default callbacks.
 */
// biome-ignore lint: empty function is intentional
export function noop(): void {}
