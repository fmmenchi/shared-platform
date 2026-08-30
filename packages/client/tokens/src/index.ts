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
  REFERENCE_PRESETS,
  COLOR_SCHEMES,
  PALETTE_FAMILIES,
} from './tokens.js';

export { tokenVars } from './refs.js';
export type { TokenRefGroup } from './refs.types.js';

export type {
  ActionFamily,
  StatusFamily,
  ColorRole,
  ThemeColors,
  ReferencePreset,
  ColorScheme,
} from './tokens.types.js';

/**
 * The theme MODEL (ADR-0033) — how a theme is declared and resolved, as
 * distinct from `ThemeColors`, which is what a finished one looks like.
 * Types only: nothing here adds a byte to a consumer's bundle.
 */
export type {
  PaletteFamily,
  PaletteSource,
  Rung,
  Ramp,
  NeutralRung,
  NeutralScale,
  ThemeDefinition,
  DesignSystem,
  RampStrategy,
  ThemeSpec,
  RungKey,
  RolePin,
  Base,
  Swatch,
  FamilyPalette,
  Palette,
  AssignmentEvidence,
  AssignmentOrigin,
  Assignment,
  Theme,
  Preset,
} from './theme.types.js';

export type {
  ViolationKind,
  ThemeViolation,
  ThemeAdvisory,
  Constraint,
  Unsatisfied,
} from './validate.types.js';
