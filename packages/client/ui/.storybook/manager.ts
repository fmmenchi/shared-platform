import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

import { dark, light } from './manager-theme.generated';

/**
 * Themes the Storybook MANAGER (chrome) from the design-system tokens. The colour +
 * brand values come from `manager-theme.generated.ts`, derived from @fmmenchi/tokens by
 * the `generate-manager-theme` target — nothing here is hand-copied. The manager runs
 * outside the preview iframe, so it can't follow the canvas `data-theme`; it picks the
 * light/dark variant from the OS preference at load instead.
 */
// Typed locally so this file needs no DOM lib in its typecheck config.
const matchMedia = (
  globalThis as {
    matchMedia?: (query: string) => { matches: boolean };
  }
).matchMedia;
const prefersDark =
  matchMedia?.('(prefers-color-scheme: dark)').matches === true;

addons.setConfig({ theme: create(prefersDark ? dark : light) });
