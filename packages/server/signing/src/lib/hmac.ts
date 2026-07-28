/**
 * HMAC-SHA256 primitives over Web Crypto (`crypto.subtle`) — no Node `crypto` import, so
 * they run on Node / edge / workers alike. These are the building blocks `sign`/`verify`
 * use, exported because they are useful on their own (webhook signatures, ETags, …).
 */

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** HMAC-SHA256 of `message` with `secret`, returned as a lowercase hex digest. */
export async function hmacSha256(
  message: string,
  secret: string,
): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of two equal-length hex/ascii digests — avoids leaking a secret
 * through timing. Unequal lengths short-circuit (a digest's length is not secret).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
