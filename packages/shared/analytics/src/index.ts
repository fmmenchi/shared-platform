export type {
  AnalyticsClient,
  AnalyticsConfig,
  AnalyticsEnv,
  AnalyticsProvider,
  AnalyticsScript,
} from './lib/analytics.types.js';
export { resolveAnalytics } from './lib/config.js';
export { createAnalytics, noopClient } from './lib/client.js';
export { analytics, initAnalytics } from './lib/facade.js';
export { analyticsScript } from './lib/script.js';
