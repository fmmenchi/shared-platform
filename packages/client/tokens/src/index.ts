/**
 * `@fmmenchi/tokens` — the token contract. Values live in `styles/*.css`
 * (consumers read `var(--fm-*)`); this TS surface enumerates the roles and types
 * a theme must satisfy, and the operations over one: `./palette`, `./theme`,
 * `./validate`, `./resolve`.
 *
 * BUILDING a theme is here, and belongs here for a reason that is easy to get
 * backwards: it looks like the Nx plugin's job, and it cannot be. The plugin
 * resolves this package from the CONSUMER's workspace at run time, precisely so
 * the gate tracks the contract they installed rather than the one the plugin was
 * compiled against — so a generator shipped inside the plugin would be frozen at
 * its release, placing yesterday's roles and emitting themes that today's
 * resolved validator rejects. It also could not read the contract at all:
 * `scope:plugins` may not depend on `scope:client`. Generating and validating are
 * two halves of one truth, and they read the same `CONTRAST_PAIRS`.
 *
 * This barrel deliberately imports no colour library: the operations that need
 * one are reached through their own subpaths, so a consumer here for `tokenVars`
 * ships none of it.
 */
export {
  ACTION_FAMILIES,
  STATUS_FAMILIES,
  COLOR_ROLES,
  RADIUS_TOKENS,
  TEXT_TOKENS,
  SPACE_TOKENS,
  FONT_TOKENS,
  FONT_WEIGHT_TOKENS,
  BORDER_WIDTH_TOKENS,
  SHADOW_TOKENS,
  SIZE_TOKENS,
  DURATION_TOKENS,
  EASE_TOKENS,
  TRANSITION_TOKENS,
  Z_TOKENS,
  colorVar,
  TOKEN_VARS,
  BREAKPOINTS,
  CONTAINER_BREAKPOINTS,
} from './tokens.types.js';

export { tokenVars } from './tokens.types.js';
export type { TokenRefGroup } from './tokens.types.js';

export type { ColorRole, Theme } from './tokens.types.js';

export type {
  ViolationKind,
  ThemeViolation,
  ContrastAdvisory,
} from './theme.types.js';
