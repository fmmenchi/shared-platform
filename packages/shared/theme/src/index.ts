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

/**
 * A THEME: read one, build one, judge one. All four verbs on one subject, in one
 * file — the pattern `palette.ts` already follows.
 *
 * `generateTheme` TAKES EVERYTHING: the stylesheet's declarations, the brand's seven
 * bases, and the ramp. It used to take an assembled palette and an alias map, which
 * left four steps to the caller and got misused on its first day — the wizard
 * omitted the stated greys, and since 34 of the 84 roles point at them the function
 * threw for every possible input. Nothing outside needs to hold the alias concept
 * now, so `toPlacements`, `Placement` and `Placements` are gone from this surface;
 * the reader is `utils/read-aliases.ts`, and the alias as something a PERSON edits
 * is an app's concept, for an app's form.
 */
export {
  parseTheme,
  toTheme,
  generateTheme,
  validateTheme,
  adviseContrast,
  CONTRAST_PAIRS,
} from './theme.js';

/**
 * The three passes `validateTheme` composes, exported individually because they
 * are what a test exercises one at a time — and because a caller measuring only
 * contrast should not have to run completeness to get there.
 */
export { validateRoles } from './utils/validate-roles.js';
export { validateContrast } from './utils/validate-contrast.js';
export { validateStates } from './utils/validate-states.js';

export type {
  Declarations,
  ViolationKind,
  ThemeViolation,
  ContrastAdvisory,
} from './theme.types.js';

export { parseCssVars, expandVars, resolveCssVar } from './utils/parse-css.js';

/**
 * A PALETTE. `generatePalette` is exported because a caller may want the ramps
 * themselves — the wizard shows them as a grid of swatches before any role is
 * pointed at one. `toPalette` is NOT: its only reader is `generateTheme`, which now
 * does that half itself.
 */
export { generatePalette } from './palette.js';

/**
 * THE DARK COUNTERPART of a set of bases. Exported for the same reason
 * `generatePalette` is: a caller collects seven brand colours and needs fourteen,
 * because a dark theme restates its bases rather than inverting the light ones.
 *
 * The rule is measured off this design system's own bases — six of the seven light
 * ones sit at 77.6–79.2% of the chroma sRGB allows at their lightness — and it
 * carries that SHARE rather than the number, since the same chroma means something
 * different at 0.75 than at 0.55.
 */
export { deriveDarkBases } from './palette.js';
export type { Rung, Ramp, Bases, Palette } from './palette.js';

/**
 * EMITTING an artefact: contract in, the text of a file out.
 *
 * The fourth verb. `parse` takes CSS text to declarations, `to` takes declarations
 * to a typed structure, `generate` takes data to data, and `emit` takes data to the
 * TEXT OF A FILE — which `generateProperties` did while sitting under the third
 * name.
 *
 * NO RAMP AND NO VALUES OF ANY KIND live in this package, and the emitter proves
 * the rule rather than bending it: it renders `properties.css`, a file of 481 lines
 * with not one value in it, from the contract's own names. The moment something
 * here needs a NUMBER a designer chose, it is in the wrong package — a `RAMP` const
 * was added and removed the same hour for exactly that.
 *
 * The emitters are here and the files they write are NOT: `@fmmenchi/tokens` is an
 * artefact package, and the code that renders an artefact is knowledge about the
 * contract. The test that pins a rendered file to `vars.css` stays over there,
 * because it has to read that stylesheet and `scope:shared` may not depend on
 * `scope:client`.
 *
 * It also buys the thing the split was for: `@fmmenchi/nx-theme-generator` is
 * `scope:plugins` and may not import a client library either, so while this lived
 * in tokens a consumer could not emit their own `properties.css` at all.
 */
export {
  emitProperties,
  toPixels,
  REGISTERED_SECTIONS,
} from './utils/emit-properties.js';
export { emitTheme } from './utils/emit-theme.js';
export type { ThemeArtefact } from './utils/emit-theme.js';
