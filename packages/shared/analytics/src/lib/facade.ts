import { createAnalytics, noopClient } from './client.js';
import type { AnalyticsClient, AnalyticsConfig } from './analytics.types.js';

let current: AnalyticsClient = noopClient;

/**
 * Bind the module-level {@link analytics} facade to a provider. Call once on the client with the
 * config the server resolved (`resolveAnalytics(env)`); pass `null` to keep it muted.
 */
export function initAnalytics(config: AnalyticsConfig | null): void {
  current = createAnalytics(config);
}

/**
 * Provider-agnostic event API for the whole app — no-op until {@link initAnalytics} runs and on
 * the server, so it's safe to call from anywhere without threading a client:
 *
 * ```ts
 * import { analytics } from '@fmmenchi/analytics';
 * analytics.track('quote_requested');
 * ```
 */
export const analytics: AnalyticsClient = {
  pageview: (path) => current.pageview(path),
  track: (event, props) => current.track(event, props),
};
