/**
 * Cookieless analytics providers supported out of the box. Add one here **and** an adapter in
 * `client.ts` (open/closed). Deliberately no Google Analytics: it sets cookies and transfers
 * data to the US — cookieless providers need no consent banner.
 */
export type AnalyticsProvider = 'umami' | 'plausible' | 'cloudflare';

/** Resolved analytics configuration (see {@link AnalyticsConfig} producers in `config.ts`). */
export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  /** Script URL (self-hosted or vendor). */
  src: string;
  /** Website id / domain — becomes the provider's data-attribute. */
  siteId: string;
  /** Beacon origin — the consuming app must add it to its CSP `connect-src`. */
  connectSrc: string;
}

/** The env keys analytics reads (a subset of the app's env). */
export interface AnalyticsEnv {
  ANALYTICS_PROVIDER?: string;
  ANALYTICS_SRC?: string;
  ANALYTICS_SITE_ID?: string;
}

/**
 * The port: a provider-agnostic event API. Consumers depend on this interface, never on a
 * concrete provider — so adding/swapping one is a single adapter, not a call-site change.
 */
export interface AnalyticsClient {
  track(event: string, props?: Record<string, unknown>): void;
  pageview(path: string): void;
}

/**
 * Framework-agnostic description of the provider `<script>` to render — plain data, so the
 * consumer emits it in any framework (React, RR, plain HTML). See `analyticsScript`.
 */
export interface AnalyticsScript {
  src: string;
  async: true;
  /** e.g. `{ 'data-website-id': '…' }` (umami) or `{ 'data-domain': '…' }` (plausible). */
  attributes: Record<string, string>;
}
