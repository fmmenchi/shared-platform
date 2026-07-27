# AGENTS.md — @fmmenchi/signing

Framework-agnostic HMAC signing — sign a value into an opaque, tamper-proof, optionally-expiring
token and verify it back. Part of `shared-platform`; workspace contract in
[../../../AGENTS.md](../../../AGENTS.md). Scope `server`, type `util`. First layer built under the
cross-app + framework-agnostic bar of [ADR-0008](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/signing
pnpm nx build @fmmenchi/signing
pnpm nx lint @fmmenchi/signing
pnpm nx test @fmmenchi/signing
```

## Shape

- Public surface (`src/index.ts` barrel): `sign` / `verify` (high-level tokens, TTL via `expiresIn`
  ms), `randomToken`, `hmacSha256`, `timingSafeEqual` (primitives). Types in `sign.types.ts`.
- Files under `src/lib/`: `base64url.ts` (Web-standard, no `Buffer`), `hmac.ts`, `random.ts`,
  `sign.ts`. `index.ts` re-exports only.

## Rules

- **Web Crypto only** — `crypto.subtle` / `crypto.getRandomValues` / `btoa` / `atob` /
  `TextEncoder`. **No `node:crypto`, no `Buffer`, no dependencies** — that is what keeps it portable
  across Node / edge / workers. Don't add a runtime dep.
- **No secrets in the browser** — it's symmetric HMAC (server/edge only); the `scope:server` boundary
  encodes that. Don't relax it to `shared`.
- **Integrity, not confidentiality** — HMAC signing only. Encryption, JWT interop, and framework
  wiring (CSRF/honeypot) are explicitly out of scope: a new concept is a new package (e.g.
  `@fmmenchi/csp`), a framework binding is an adapter package — never folded in here (ADR-0008).
- Token format: `base64url(JSON{ v, exp? }).hmacSha256(payload, secret)` — the value is encoded
  internally, so callers pass any string. `verify` checks signature **and** expiry together.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
