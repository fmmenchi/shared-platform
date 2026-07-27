import type {
  AnalyticsConfig,
  AnalyticsEnv,
  AnalyticsProvider,
} from './analytics.types.js';

const PROVIDERS: readonly AnalyticsProvider[] = [
  'umami',
  'plausible',
  'cloudflare',
];

const isProvider = (value: string | undefined): value is AnalyticsProvider =>
  value !== undefined && (PROVIDERS as readonly string[]).includes(value);

/**
 * Resolve the analytics config from env. Returns `null` when analytics is off — the default:
 * no env set → no script, no tracking. Validates the provider and the script URL so a typo
 * disables analytics instead of breaking the page. Isomorphic (server resolves it, then hands
 * it to the client and adds `connectSrc` to the CSP).
 */
export function resolveAnalytics(env: AnalyticsEnv): AnalyticsConfig | null {
  const {
    ANALYTICS_PROVIDER: provider,
    ANALYTICS_SITE_ID: siteId,
    ANALYTICS_SRC: src,
  } = env;
  if (!isProvider(provider) || !src || !siteId) return null;

  let connectSrc: string;
  try {
    connectSrc = new URL(src).origin;
  } catch {
    return null;
  }

  return { connectSrc, provider, siteId, src };
}
