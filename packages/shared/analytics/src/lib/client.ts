import type {
  AnalyticsClient,
  AnalyticsConfig,
  AnalyticsProvider,
} from './analytics.types.js';

/** Does nothing — used on the server, when analytics is off, or for mute providers. */
export const noopClient: AnalyticsClient = {
  pageview() {
    /* no-op */
  },
  track() {
    /* no-op */
  },
};

type AnalyticsGlobals = typeof globalThis & {
  umami?: { track?: (event: unknown, props?: unknown) => void };
  plausible?: (
    event: string,
    options?: { props?: unknown; u?: string },
  ) => void;
};

// Adapters: each wraps the browser global that the provider's script created.
const umami = (): AnalyticsClient => ({
  pageview: (path) =>
    (globalThis as AnalyticsGlobals).umami?.track?.({ url: path }),
  track: (event, props) =>
    (globalThis as AnalyticsGlobals).umami?.track?.(event, props),
});

const plausible = (): AnalyticsClient => ({
  pageview: (path) =>
    (globalThis as AnalyticsGlobals).plausible?.('pageview', { u: path }),
  track: (event, props) =>
    (globalThis as AnalyticsGlobals).plausible?.(event, { props }),
});

const ADAPTERS: Record<AnalyticsProvider, () => AnalyticsClient> = {
  // Cloudflare Web Analytics has no custom-event API → mute.
  cloudflare: () => noopClient,
  plausible,
  umami,
};

/**
 * Build the client for a config. Returns {@link noopClient} on the server (no `window`) or when
 * analytics is disabled, so callers never branch on it — `createAnalytics(cfg).track(…)` is safe
 * everywhere.
 */
export function createAnalytics(
  config: AnalyticsConfig | null,
): AnalyticsClient {
  // Browser check without depending on DOM lib types (this is a `shared`/isomorphic package):
  // in a browser `window` is a property of globalThis; on the server it isn't.
  const inBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
  if (!config || !inBrowser) return noopClient;
  return ADAPTERS[config.provider]();
}
