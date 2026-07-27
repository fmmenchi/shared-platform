import type { AnalyticsConfig, AnalyticsScript } from './analytics.types.js';

/**
 * Describe the provider `<script>` to load, as **plain data** — `null` when analytics is off (so
 * the default ships zero third-party code). The consumer renders it in its own framework (React,
 * React Router, plain HTML) and adds its CSP `nonce`; this layer never touches the DOM or a
 * framework:
 *
 * ```tsx
 * const s = analyticsScript(config);
 * return s && <script async nonce={nonce} src={s.src} {...s.attributes} />;
 * ```
 *
 * The app must also add `config.connectSrc` to its CSP `connect-src`.
 */
export function analyticsScript(
  config: AnalyticsConfig | null,
): AnalyticsScript | null {
  if (!config) return null;
  const attributes: Record<string, string> =
    config.provider === 'umami'
      ? { 'data-website-id': config.siteId }
      : { 'data-domain': config.siteId };
  return { src: config.src, async: true, attributes };
}
