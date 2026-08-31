/**
 * THE ENTRYPOINTS — the five things you can do with a theme.
 *
 *   parseTheme(...css)      stylesheets  -> the `--fm-*` declarations in them
 *   toTheme(declared)       declarations -> a theme: every role, resolved
 *   generateTheme(palette)  a palette    -> a theme: every role, placed
 *   toCssVars(theme)        a theme      -> a stylesheet
 *   validateTheme(theme)    a theme      -> what is wrong with it
 *
 * TWO WAYS IN, one check, one way out. Reading an existing theme and building a
 * new one arrive at the same `Theme`, which is what lets everything downstream
 * treat a generated theme and a hand-written one alike — the wizard's output goes
 * through the validator a hand-edited preset does, not a lenient cousin of it.
 *
 * They are separate because the middle step is where the interesting failure
 * lives: a stylesheet can be read fine and still not describe a theme, and a
 * theme can be complete and still be unusable. Collapsing parse and resolve into
 * one call would hide which of the two went wrong.
 *
 * NOTHING IS IMPLEMENTED HERE beyond composing what `utils/` provides. That is
 * the point of the file: opening it should answer "what can I do", not "how does
 * contrast work". Each area lives with its own kind — reading CSS, measuring
 * contrast, judging states — so a reader looking for one is not reading the
 * others on the way.
 */
import { assignRoles } from './utils/assign-roles.js';
import { parseCssVars, resolveCssVar } from './utils/parse-css.js';
import { COLOR_ROLES, colorVar } from './tokens.types.js';
import { validateContrast } from './utils/validate-contrast.js';
import { validateRoles } from './utils/validate-roles.js';
import { validateStates } from './utils/validate-states.js';
import type { ColorScheme } from './utils/assign-roles.js';
import type { Palette } from './palette.js';
import type { ColorRole, Theme } from './tokens.types.js';
import type { ThemeViolation } from './theme.types.js';

export type { ColorScheme } from './utils/assign-roles.js';

/**
 * Every `--fm-*` declaration in one or more stylesheets.
 *
 * Sources are given in CASCADE ORDER and merged the way a browser merges them:
 * a later declaration wins. That is what lets a preset be read as part of a
 * whole — `presets/dark.css` overrides the roles it changes and references the
 * greys it never redeclares.
 *
 * Comments are stripped before parsing. A role commented out during a retune
 * would otherwise read as declared, and every gate would then pass on a role the
 * shipped CSS does not define.
 */
export function parseTheme(...sources: readonly string[]): Map<string, string> {
  const declared = new Map<string, string>();
  for (const css of sources) {
    for (const [name, value] of parseCssVars(css)) declared.set(name, value);
  }
  return declared;
}

/**
 * The theme those declarations describe: every colour role, RESOLVED.
 *
 * `var()` chains are followed and the relative-colour ramp is evaluated, because
 * a role points at a palette rung and a rung is `oklch(from …)`. An unresolved
 * theme cannot be measured, and a validator that cannot measure is worse than
 * none — it reports nothing wrong.
 *
 * THROWS on a reference that nothing declares, rather than returning a theme
 * with a hole in it. Reading `presets/dark.css` by itself does exactly that: it
 * points at greys only `vars.css` declares. The refusal is deliberate — half a
 * theme that looks whole is the one thing a caller cannot detect.
 *
 * A role that is simply ABSENT is different, and is left absent: that is the gap
 * `validateTheme()` reports as `missing-role`, and inventing a value would hide
 * it.
 */
export function toTheme(declared: ReadonlyMap<string, string>): Partial<Theme> {
  const theme: Partial<Record<ColorRole, string>> = {};
  for (const role of COLOR_ROLES) {
    const raw = declared.get(colorVar(role));
    if (raw !== undefined) theme[role] = resolveCssVar(raw, declared);
  }
  return theme;
}

/**
 * The theme a palette describes: every colour role, PLACED.
 *
 * The other way in. `toTheme` reads a theme somebody already wrote; this one
 * builds a theme nobody has written yet, from the eight colours a brand actually
 * hands over. Both land on the same `Theme`, so the wizard's output faces the
 * same validator as a hand-edited preset.
 *
 * It is a lookup, not a solver, and that is a measured fact rather than a
 * simplification: read off the shipped themes, all 84 roles land exactly on a
 * rung. The rungs carry absolute lightness, so a placement that clears its
 * contrast floor for one brand clears it for the next — which is why the search
 * a builder would seem to need is not here. What can still go wrong is a base
 * whose gamut clamps a rung out of reach, and that is what `validateTheme` is
 * for: it judges the result, it does not produce it.
 *
 * THROWS when the palette lacks a rung a placement names, rather than returning
 * a theme with holes. An undefined role resolves to its `@property`
 * initial-value — opaque black, in both themes, with nothing falsy to detect —
 * so the hole would survive every check that looks at what is present.
 */
export function generateTheme(palette: Palette, scheme: ColorScheme): Theme {
  return assignRoles(palette, scheme);
}

/**
 * Emit a theme as CSS custom properties.
 *
 * The first of the bindings, and the one the others are measured against:
 * custom properties are the universal surface, so a Tailwind bridge or a DTCG
 * file is an alternative rendering OF this, never a replacement for it.
 *
 * It decides nothing about colour — whatever `toTheme` resolved, or a generator
 * computed, is what lands. That is what lets it round-trip, and what keeps two
 * opinions about what a theme may hold out of two different files.
 */
export function toCssVars(theme: Partial<Theme>, selector = ':root'): string {
  const lines = COLOR_ROLES.filter((role) => theme[role] !== undefined).map(
    (role) => `  ${colorVar(role)}: ${theme[role] as string};`,
  );

  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

// `ThemeViolation` moved to `validate.types.ts` with every other type in this
// package. Re-exported because it is part of this subpath's public API.
export type { ContrastAdvisory, ThemeViolation } from './theme.types.js';

/**
 * Validate a complete color-role assignment. Returns [] when the theme is
 * allowed; otherwise one violation per problem (completeness, stray roles,
 * unparsable values, failed pairs).
 */
/**
 * Everything wrong with a theme, or `[]` when it is allowed.
 *
 * Three passes, in the order a reader would ask them in: are the roles there and
 * paintable, do the declared pairs clear their floors, and do the states still
 * look like states. The first produces what the other two measure, which is why
 * it is not merely first but a dependency.
 *
 * Advisories are NOT here — `adviseContrast()` reports those. `[]` from this
 * function has to keep meaning "allowed", and something worth a look is not a
 * reason to refuse a theme.
 */
export function validateTheme(
  colors: Readonly<Record<string, string>>,
): ThemeViolation[] {
  const { parsable, violations } = validateRoles(colors);

  return [
    ...violations,
    ...validateContrast(colors, parsable),
    ...validateStates(parsable),
  ];
}

export { adviseContrast, CONTRAST_PAIRS } from './utils/validate-contrast.js';
