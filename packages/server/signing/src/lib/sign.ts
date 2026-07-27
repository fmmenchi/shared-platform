import { base64UrlDecode, base64UrlEncode } from './base64url.js';
import { hmacSha256, timingSafeEqual } from './hmac.js';
import type { SignOptions } from './sign.types.js';

/** Internal token payload: the value, plus an optional absolute expiry (ms since epoch). */
interface Payload {
  v: string;
  exp?: number;
}

/**
 * Sign `value` into an opaque `"<payload>.<hmac>"` token — tamper-proof, and self-expiring
 * when `expiresIn` is given. The value is encoded internally, so callers pass **any** string
 * (no "must base64url first" footgun). Verify it back with {@link verify}.
 *
 * The secret must stay server-side (this is symmetric HMAC — a secret in the browser is a
 * leak); use it from an SSR/API/serverless/edge runtime, never a client bundle.
 */
export async function sign(
  value: string,
  secret: string,
  opts: SignOptions = {},
): Promise<string> {
  const payload: Payload = { v: value };
  if (opts.expiresIn != null) payload.exp = Date.now() + opts.expiresIn;
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const mac = await hmacSha256(encoded, secret);
  return `${encoded}.${mac}`;
}

/**
 * Verify a token from {@link sign} and return the original value, or `null` if the signature
 * is missing/invalid or the token has expired. Signature and expiry are checked together, so
 * a caller can never act on a tampered or stale token.
 */
export async function verify(
  token: string,
  secret: string,
): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const mac = token.slice(dot + 1);

  const expected = await hmacSha256(encoded, secret);
  if (!timingSafeEqual(mac, expected)) return null;

  const json = base64UrlDecode(encoded);
  if (json === null) return null;
  let payload: Payload;
  try {
    payload = JSON.parse(json) as Payload;
  } catch {
    return null;
  }
  if (typeof payload.v !== 'string') return null;
  if (payload.exp != null && Date.now() > payload.exp) return null;
  return payload.v;
}
