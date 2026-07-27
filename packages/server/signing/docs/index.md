---
title: '@fmmenchi/signing'
sidebar_label: signing
sidebar_position: 0
---

# @fmmenchi/signing

Framework-agnostic **HMAC signing**: turn a value into an opaque, tamper-proof, optionally-expiring
token and verify it back. **Web Crypto only** (Node / edge / worker), **zero dependencies**.

It's the first layer built under [ADR-0008](../../adr/0008-cross-app-framework-agnostic-layers.md)'s
bar — cross-app reusable **and** framework-agnostic — and the first inhabitant of the `server` scope.

## Install

```bash
pnpm add @fmmenchi/signing
```

## Usage

```ts
import { sign, verify, randomToken } from '@fmmenchi/signing';

// A magic-link token, valid 15 minutes
const token = await sign(userId, process.env.AUTH_SECRET, {
  expiresIn: 15 * 60_000,
});

// On the callback — SSR action, API route, or edge worker; the library doesn't care:
const userId = await verify(token, process.env.AUTH_SECRET);
if (userId === null) throw new Error('invalid or expired link');

const slug = randomToken(16); // unguessable, no secret needed
```

`verify` returns the value or `null` (bad signature **or** expired — checked together). The value is
encoded internally, so it may contain any character.

## Reference

| Export            | Signature                                             | Purpose                                 |
| ----------------- | ----------------------------------------------------- | --------------------------------------- |
| `sign`            | `(value, secret, { expiresIn? }?) => Promise<string>` | Signed opaque token; `expiresIn` in ms. |
| `verify`          | `(token, secret) => Promise<string \| null>`          | Original value, or `null`.              |
| `randomToken`     | `(bytes = 32) => string`                              | Crypto-strong, base64url.               |
| `hmacSha256`      | `(message, secret) => Promise<string>`                | Raw HMAC-SHA256 hex digest.             |
| `timingSafeEqual` | `(a, b) => boolean`                                   | Constant-time compare of equal-length.  |

## Boundaries

- **Server-side only** — symmetric HMAC, the secret never ships to a client bundle (`scope:server`).
- **Integrity, not confidentiality** — signing, not encryption. No JWT interop.
- **No framework wiring** — CSRF/honeypot form handling is a consumer concern (or an adapter package),
  never folded in here.
