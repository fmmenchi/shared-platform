/**
 * `@fmmenchi/tokens` — the token contract. Values live in `styles/*.css`
 * (consumers read `var(--fm-*)`); this TS surface enumerates the roles and
 * types a theme must satisfy. Implementation: `contract/tokens.ts`; types:
 * `contract/tokens.types.ts`; theme validation: `validations/validate.ts`.
 *
 * BUILDING a theme is not here. The model a theme is derived from, and the
 * solver over it, live in `@fmmenchi/theme-engine`, which depends on this — the
 * one direction that is allowed. This package says what a theme must satisfy;
 * that one says how one is arrived at.
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
} from './validate.types.js';
