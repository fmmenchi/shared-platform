# @fmmenchi/signing

Framework-agnostic **HMAC signing**: turn a value into an opaque, tamper-proof, optionally-expiring
token and verify it back. Web Crypto only — runs on **Node, edge, and workers** — with **no
dependencies**.

Use it for magic links, unguessable share URLs, signed cookies, CSRF tokens, webhook signatures.

```bash
pnpm add @fmmenchi/signing
```

## Usage

```ts
import { sign, verify, randomToken } from '@fmmenchi/signing';

// A magic-link token, valid for 15 minutes
const token = await sign(userId, process.env.AUTH_SECRET, {
  expiresIn: 15 * 60_000,
});

// Later, on the callback (SSR action / API route / worker — the library doesn't care):
const userId = await verify(token, process.env.AUTH_SECRET);
if (userId === null) throw new Error('invalid or expired link');

// An unguessable slug (no secret needed):
const slug = randomToken(16);
```

`verify` returns the original value, or `null` if the signature is invalid **or** the token has
expired — one check, no half-trusted tokens. The value is encoded internally, so it may contain any
character (dots, unicode, JSON).

## API

| Export            | Signature                                             | Purpose                                        |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `sign`            | `(value, secret, { expiresIn? }?) => Promise<string>` | Signed, opaque token; `expiresIn` in ms.       |
| `verify`          | `(token, secret) => Promise<string \| null>`          | Original value, or `null` (bad sig / expired). |
| `randomToken`     | `(bytes = 32) => string`                              | Cryptographically-strong, base64url.           |
| `hmacSha256`      | `(message, secret) => Promise<string>`                | Raw HMAC-SHA256 hex digest.                    |
| `timingSafeEqual` | `(a, b) => boolean`                                   | Constant-time compare of equal-length digests. |

## Server-side only

This is **symmetric** HMAC — the `secret` must stay on the server (a secret in a client bundle is a
leak). Call it from an SSR/API/serverless/edge runtime; a browser app uses it via its backend. This is
why the package is `scope:server`.

**Not in scope** (by design): encryption/confidentiality (this is integrity/authenticity only), JWT
interop, and any framework wiring (CSRF/honeypot form handling belongs in the consumer or an adapter).
