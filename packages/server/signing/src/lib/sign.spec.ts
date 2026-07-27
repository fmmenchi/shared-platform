import { afterEach, describe, expect, it, vi } from 'vitest';

import { base64UrlDecode, base64UrlEncode } from './base64url.js';
import { hmacSha256, timingSafeEqual } from './hmac.js';
import { randomToken } from './random.js';
import { sign, verify } from './sign.js';

const SECRET = 'correct horse battery staple';

describe('sign / verify', () => {
  afterEach(() => vi.useRealTimers());

  it('round-trips an arbitrary value', async () => {
    const token = await sign('user-42', SECRET);
    expect(await verify(token, SECRET)).toBe('user-42');
  });

  it('encodes internally — value may contain dots and unicode', async () => {
    const value = 'a.b.c 日本語 🔐 {"x":1}';
    const token = await sign(value, SECRET);
    expect(await verify(token, SECRET)).toBe(value);
  });

  it('rejects a wrong secret', async () => {
    const token = await sign('x', SECRET);
    expect(await verify(token, 'other secret')).toBeNull();
  });

  it('rejects a tampered payload or signature', async () => {
    const token = await sign('admin=false', SECRET);
    const [payload, mac] = token.split('.');
    // Flip the last char of the signature.
    const badMac = mac.slice(0, -1) + (mac.at(-1) === 'a' ? 'b' : 'a');
    expect(await verify(`${payload}.${badMac}`, SECRET)).toBeNull();
    // Re-encode a different payload with the old signature.
    const forged = base64UrlEncode(JSON.stringify({ v: 'admin=true' }));
    expect(await verify(`${forged}.${mac}`, SECRET)).toBeNull();
  });

  it('rejects a malformed token (no separator)', async () => {
    expect(await verify('not-a-token', SECRET)).toBeNull();
  });

  it('rejects an oversized token before doing any HMAC work', async () => {
    const token = await sign('x', SECRET);
    expect(await verify(token + 'A'.repeat(9000), SECRET)).toBeNull();
  });

  it('throws on an empty secret (sign and verify)', async () => {
    await expect(sign('x', '')).rejects.toThrow(/non-empty/);
    await expect(verify('a.b', '')).rejects.toThrow(/non-empty/);
  });

  it('honours expiry: valid before, null after', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await sign('s', SECRET, { expiresIn: 1000 });
    expect(await verify(token, SECRET)).toBe('s');
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z')); // +2s, past the 1s TTL
    expect(await verify(token, SECRET)).toBeNull();
  });

  it('a token without expiry never expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await sign('forever', SECRET);
    vi.setSystemTime(new Date('2126-01-01T00:00:00Z')); // +100 years
    expect(await verify(token, SECRET)).toBe('forever');
  });
});

describe('primitives', () => {
  it('randomToken is unique, url-safe, and scales with entropy', () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomToken(32).length).toBeGreaterThan(randomToken(8).length);
  });

  it('hmacSha256 is deterministic and secret-dependent', async () => {
    expect(await hmacSha256('m', SECRET)).toBe(await hmacSha256('m', SECRET));
    expect(await hmacSha256('m', SECRET)).not.toBe(await hmacSha256('m', 'x'));
    expect(await hmacSha256('m', SECRET)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('timingSafeEqual compares by content and length', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'ab')).toBe(false);
  });

  it('base64url round-trips and rejects garbage', () => {
    expect(base64UrlDecode(base64UrlEncode('héllo/+='))).toBe('héllo/+=');
    expect(base64UrlEncode('x')).not.toMatch(/[+/=]/);
  });
});
