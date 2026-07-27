# ADR 0008 — What earns a place as a shared layer

- **Status:** accepted (2026-07-27)
- **Date:** 2026-07-27
- **Deciders:** Fabio Menchicchi

## Context and problem statement

The platform's original scope claim listed "shared layers (UI, AI, data access, security, prompts,
analytics, MCP)". Treating that list as a build backlog is a trap: several entries are **product
concerns**, not reusable layers. A sibling product repo, `andes-routes`, has concrete `libs/*` for
most of them — but "having a `lib/prompts`" does not make "prompts" a shared layer.

We need a hard, testable bar for _"does this belong here, and as what shape?"_ — otherwise the
monorepo accretes thin, product-shaped or category-shaped packages that are **useless technical
debt**: code to maintain, version and publish that no second app can actually reuse.

## Decision

### 1. The admission test — two gates

A package earns a place only if it passes **both**:

- **Cross-app reusable** — more than one app would consume the _same code as-is_. Content authored
  per app fails: prompt text, an app's data schemas/queries, an app's MCP surface. (A thin generic
  _engine_ under one of those may pass on its own merits; the content never does.)
- **Framework-agnostic** — no dependency on a consumer's runtime or framework (React Router, Express,
  a specific SSR host). A layer ships pure engines/primitives and plain data; the consumer wires them
  in. Fail either gate → we **don't build it**; the wiring lives in the consumer.

### 2. Granularity — one cohesive concept per package, never a category

A package is a **cohesive unit** (one responsibility), like `notify`, `tokens`, `ui` — not a
**category bucket**. "security" is a category (signing, CSP, CSRF, sanitization, authz, rate-limit are
unrelated mechanisms) → a `@fmmenchi/security` umbrella is a **junk-drawer anti-pattern** and is
inconsistent with the platform's own package model. Split by **concept**: `@fmmenchi/signing`,
`@fmmenchi/csp`, … each its own package. The other extreme is also wrong: don't split _below_ the
concept (`hmac` and `randomToken` are not separate packages — they serve one concept, signing). Small
but cohesive is fine (the platform is built for independent per-package release).

### 3. Framework-coupled behaviour — pure function first, ports & adapters last

When something needs the framework (read a cookie, a form field):

- **Prefer a pure function** that receives the already-extracted plain values
  (`validateCsrf(cookieToken, submittedToken, secret)`) — the core stays framework-free and the
  trivial extraction glue lives in the consumer. No interface needed.
- **Introduce a port (interface, plain types only) + adapters** _only_ when the core needs an ongoing
  runtime capability (set a cookie, read arbitrary headers, a session/KV store), not to pass two
  values. Adapters are **framework-binding** packages (`@fmmenchi/csrf-react-router`), a distinct
  category from agnostic cores, and graduate to a shared package only when **more than one app** needs
  the same binding. "Framework-agnostic" is the rule for **cores**; adapters are coupled by trade.

### Worked examples

- **`prompts` — rejected.** Prompt _content_ is per-app; the parse/validate/render engine is thin and
  format-opinionated. No second app reuses it as-is → out.
- **`signing` — accepted.** `andes-routes`' `libs/security` splits cleanly: its `crypto.ts` (HMAC
  sign/verify, random token, constant-time compare, base64url) uses **only Web Crypto** — zero
  framework imports, cross-app, correctness-critical → **this is a layer**, named for the concept
  (`@fmmenchi/signing`), not the category. Its `csrf.ts`/`honeypot.ts` pull in `react-router` →
  framework-coupled → **out** (consumer or a future adapter). The extracted API is _corrected_, not
  copied: internal encoding (no "caller must base64url" footgun), Web-standard base64url (edge/worker
  portable), and built-in TTL (so consumers don't each re-bolt a timestamp check).

## Consequences

- The scope claim in the root `AGENTS.md` is trimmed to the two gates; `prompts`, `data-access`, `MCP`
  are named consumer concerns, not promised layers.
- New layers are **extracted, not invented** — anchored to a proven implementation, then stripped to
  the framework-free, cross-app core and named by concept. The granularity + adapter rules are the
  operating form of the [architecture](../architecture.md) promotion rule.
- First layer under this bar: **`@fmmenchi/signing`** (`scope:server`) — Web-standard HMAC signing,
  Node / edge / worker portable, populating the previously-empty `server` scope.
