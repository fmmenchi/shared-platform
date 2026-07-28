---
title: '@fmmenchi/analytics'
sidebar_label: analytics
sidebar_position: 0
---

# @fmmenchi/analytics

Provider-agnostic, **cookieless** web analytics: one `track()` / `pageview()` API over **Umami**,
**Plausible**, or **Cloudflare**, resolved from env and **off by default**. Framework-agnostic,
isomorphic, **no dependencies**.

Built under [ADR-0008](../../adr/0008-cross-app-framework-agnostic-layers.md)'s bar — the same
provider-agnostic shape as [`@fmmenchi/notify`](../notify/index.md), for analytics instead of
notifications.

## Install

```bash
pnpm add @fmmenchi/analytics
```

## Usage

```ts
import {
  resolveAnalytics,
  initAnalytics,
  analytics,
} from '@fmmenchi/analytics';

// server (SSR / API): from env — null when unset, so analytics stays off
const config = resolveAnalytics(process.env); // also add config?.connectSrc to your CSP connect-src

// client, once at startup:
initAnalytics(config);

// anywhere:
analytics.track('quote_requested', { plan: 'pro' });
```

Render the provider `<script>` yourself, in any framework, from plain data:

```tsx
import { analyticsScript } from '@fmmenchi/analytics';
const s = analyticsScript(config);
return s && <script async nonce={nonce} src={s.src} {...s.attributes} />;
```

## Reference

| Export             | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `resolveAnalytics` | `env → AnalyticsConfig \| null` (validates; a typo disables, never breaks).         |
| `initAnalytics`    | Bind the module `analytics` facade once (client).                                   |
| `analytics`        | Provider-agnostic `track` / `pageview` — call it from any module.                   |
| `createAnalytics`  | Build a client directly (no-op on the server / when off).                           |
| `analyticsScript`  | `{ src, async, attributes } \| null` — render the provider script in any framework. |
| `noopClient`       | The do-nothing client.                                                              |

## Boundaries

- **Provider-agnostic port** — add a provider via `AnalyticsProvider` + a `client.ts` adapter. No
  Google Analytics by design (cookies + US transfer).
- **Framework-agnostic** — no React/DOM here; `analyticsScript` returns data, the consumer renders it.
- **Isomorphic** — server resolves + CSP; client tracks; no-op until a browser + `initAnalytics`.
