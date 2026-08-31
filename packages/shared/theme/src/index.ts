/**
 * `@fmmenchi/theme` — what a theme IS, and whether one is allowed.
 *
 * PRIVATE AND SOURCE-ONLY. It is not published: its consumers bundle it, which is
 * why `exports` points at `src/` and there is no build target. It exists because
 * of a boundary, and the boundary is the whole justification — so it is written
 * down here rather than rediscovered.
 *
 * `@fmmenchi/tokens` is `scope:client` and `@fmmenchi/nx-theme-generator` is
 * `scope:plugins`, and the workspace forbids a plugin from depending on a client
 * library. Yet both need the same three things: the enumeration of every role,
 * the rules a theme must satisfy, and the maths to measure a colour. Before this
 * package existed the generator reached them through `createRequire` and dynamic
 * `import()` against whatever version the consumer had installed — with two
 * `tokensPath` escape hatches, a "could not resolve" branch, and a
 * comment-stripping regex inlined by hand in two files, each with a comment
 * apologising for it.
 *
 * `scope:shared` is the one scope a client library, a plugin AND an app may all
 * depend on. So the contract lives here and everything reaches it by a plain
 * import.
 *
 * WHAT IS NOT HERE: the values. `@fmmenchi/tokens` owns `styles/*.css` — those
 * numbers are the design work, and this package has no opinion about them. It
 * says what a theme must satisfy; that one says what ours is.
 */
export {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
  NEUTRAL_ROLES,
  SURFACE_ROLES,
  INPUT_ROLES,
  COLOR_ROLES,
  PALETTE_FAMILIES,
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
  tokenVars,
} from './tokens.types.js';

export type {
  ColorRole,
  PaletteFamily,
  Theme,
  TokenRefGroup,
} from './tokens.types.js';

export {
  parseTheme,
  toTheme,
  validateTheme,
  adviseContrast,
  CONTRAST_PAIRS,
} from './validate.js';

/**
 * The three passes `validateTheme` composes, exported individually because they
 * are what a test exercises one at a time — and because a caller measuring only
 * contrast should not have to run completeness to get there.
 */
export { validateRoles } from './utils/validate-roles.js';
export { validateContrast } from './utils/validate-contrast.js';
export { validateStates } from './utils/validate-states.js';

export type {
  ViolationKind,
  ThemeViolation,
  ContrastAdvisory,
} from './validate.types.js';

export { parseCssVars, expandVars, resolveCssVar } from './utils/parse-css.js';

export { generatePalette } from './palette.js';
export type { Rung, Ramp, Bases, Palette } from './palette.js';
