/**
 * `@fmmenchi/tokens` — the token contract. Values live in `styles/*.css`
 * (consumers read `var(--fm-*)`); this TS surface enumerates the roles and
 * types a theme must satisfy. Implementation: `./tokens.ts`; types:
 * `./tokens.types.ts`; theme validation: `./validate.ts`.
 */
export {
  ACTION_FAMILIES,
  STATUS_FAMILIES,
  COLOR_ROLES,
  RADIUS_TOKENS,
  SPACE_TOKENS,
  FONT_TOKENS,
  TEXT_TOKENS,
  FONT_WEIGHT_TOKENS,
  LEADING_TOKENS,
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
  REFERENCE_PRESETS,
} from './tokens.js';

export type {
  ActionFamily,
  StatusFamily,
  ColorRole,
  ThemeColors,
  ReferencePreset,
} from './tokens.types.js';
