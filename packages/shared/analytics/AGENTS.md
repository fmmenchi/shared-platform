# AGENTS.md — @fmmenchi/analytics

Provider-agnostic, cookieless web analytics — one `track()`/`pageview()` API over Umami / Plausible /
Cloudflare, off by default. Part of `shared-platform`; workspace contract in
[../../../AGENTS.md](../../../AGENTS.md). Scope `shared`, type `util`. Built under the cross-app +
framework-agnostic bar of [ADR-0008](../../../apps/docusaurus/docs/adr/0008-cross-app-framework-agnostic-layers.md).

## Commands

```bash
pnpm nx typecheck @fmmenchi/analytics
pnpm nx build @fmmenchi/analytics
pnpm nx lint @fmmenchi/analytics
pnpm nx test @fmmenchi/analytics
```

## Shape

- Public surface (`src/index.ts`): `resolveAnalytics` (env → config), `initAnalytics` + `analytics`
  (module facade), `createAnalytics`, `analyticsScript` (plain script data), `noopClient` + the types.
- `src/lib/`: `analytics.types.ts` (all types), `config.ts` (resolve), `client.ts` (adapters +
  `createAnalytics`), `facade.ts` (singleton), `script.ts` (script data). `index.ts` re-exports only.

## Rules

- **Framework-agnostic + no deps.** No React, no framework, no DOM types at build (it's `shared`):
  the browser check uses `'window' in globalThis`, not `window`. `analyticsScript` returns **data**
  — the JSX/`<script>` rendering and any `<Analytics>` React component belong to the consumer (or an
  adapter package), never here (ADR-0008).
- **Off by default, cookieless only.** `resolveAnalytics` returns `null` unless env is set and valid
  (a typo disables, never breaks the page). No Google Analytics (cookies + US transfer).
- **Open/closed providers.** Add a provider by extending `AnalyticsProvider` **and** adding a
  `client.ts` adapter + `script.ts` attributes — never a call-site branch.
- **Isomorphic.** `createAnalytics`/`analytics` no-op on the server; safe to import anywhere.

`CLAUDE.md` is a symlink to this file — edit `AGENTS.md` only.
