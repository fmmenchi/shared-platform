import { bytesToBase64Url } from './base64url.js';

/**
 * A cryptographically-strong random token, base64url-encoded — for unguessable slugs,
 * IDs, nonces or CSRF tokens. `bytes` is the entropy (default 32 → 256 bits); the string
 * is longer than `bytes` (base64 expansion). Uses `crypto.getRandomValues`.
 */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToBase64Url(buf);
}
