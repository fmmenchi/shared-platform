/**
 * Web-standard base64url — URL/cookie-safe, no padding. Uses `btoa`/`atob` +
 * `TextEncoder`/`TextDecoder` (available in Node 16+, browsers, edge, workers), so the
 * package carries no `Buffer` dependency and runs on any server/edge runtime.
 */

const toBase64Url = (binary: string): string =>
  btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Base64url-encode raw bytes (e.g. random tokens). */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return toBase64Url(binary);
}

/** Base64url-encode a UTF-8 string. */
export function base64UrlEncode(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

/** Base64url-decode back to a UTF-8 string; `null` on malformed input. */
export function base64UrlDecode(value: string): string | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
