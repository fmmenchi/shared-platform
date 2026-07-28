# @fmmenchi/analytics

Provider-agnostic, **cookieless** web analytics: one `track()` / `pageview()` API over **Umami**,
**Plausible**, or **Cloudflare**, resolved from env and **off by default**. Framework-agnostic,
isomorphic, **no dependencies** — swap providers without touching a call site, and ship zero
third-party code until you configure one.

```bash
pnpm add @fmmenchi/analytics
```

## Usage

Resolve the config server-side, hand it to the client, and call `analytics` anywhere:

```ts
import {
  resolveAnalytics,
  initAnalytics,
  analytics,
} from '@fmmenchi/analytics';

// server (SSR loader / API): from env — null when unset (analytics stays off)
const config = resolveAnalytics(process.env);
// also add config?.connectSrc to your CSP `connect-src`.

// client, once at startup:
initAnalytics(config);

// then, from any module:
analytics.track('quote_requested', { plan: 'pro' });
analytics.pageview('/pricing');
```

Render the provider script yourself, in any framework, from plain data — no React coupling:

```tsx
import { analyticsScript } from '@fmmenchi/analytics';
const s = analyticsScript(config);
return s && <script async nonce={nonce} src={s.src} {...s.attributes} />;
```

## API

| Export                                                                                   | Purpose                                                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `resolveAnalytics(env)`                                                                  | `AnalyticsConfig \| null` from `ANALYTICS_PROVIDER/SRC/SITE_ID` (validates; a typo → off). |
| `initAnalytics(config)` / `analytics`                                                    | Bind the module facade once; then `analytics.track/pageview` anywhere.                     |
| `createAnalytics(config)`                                                                | Build a client directly (no-op on the server or when off).                                 |
| `analyticsScript(config)`                                                                | Plain `{ src, async, attributes } \| null` — render the provider `<script>` yourself.      |
| `noopClient`                                                                             | The do-nothing client (server / disabled).                                                 |
| `AnalyticsProvider` `AnalyticsClient` `AnalyticsConfig` `AnalyticsEnv` `AnalyticsScript` | Types.                                                                                     |

## Boundaries

- **Provider-agnostic port** — add a provider by extending `AnalyticsProvider` + a `client.ts`
  adapter (open/closed). No Google Analytics by design (cookies + US transfer → needs a banner).
- **Framework-agnostic** — `analyticsScript` returns data; the DOM/JSX rendering and a `<Analytics>`
  React component are the consumer's (or an adapter package's), never here.
- **Isomorphic** — safe to import on the server (`resolveAnalytics`, CSP) and the client
  (`createAnalytics`/`track`); it no-ops until a browser + `initAnalytics`.
