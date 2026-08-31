/**
 * THE ENTRYPOINTS — the four things you can do with a theme.
 *
 *   parseTheme(...css)   stylesheets  -> the `--fm-*` declarations in them
 *   toTheme(declared)    declarations -> a theme: every role, resolved
 *   validateTheme(theme) a theme      -> what is wrong with it
 *
 * A pipeline one way and one function back out. They are separate because the
 * middle step is where the interesting failure lives: a stylesheet can be read
 * fine and still not describe a theme, and a theme can be complete and still be
 * unusable. Collapsing parse and resolve into one call would hide which of the
 * two went wrong.
 *
 * NOTHING IS IMPLEMENTED HERE beyond composing what `utils/` provides. That is
 * the point of the file: opening it should answer "what can I do", not "how does
 * contrast work". Each area lives with its own kind — reading CSS, measuring
 * contrast, judging states — so a reader looking for one is not reading the
 * others on the way.
 */
import { parseCssVars, resolveCssVar } from './utils/parse-css.js';
import { COLOR_ROLES, colorVar } from './tokens.types.js';
import { validateContrast } from './utils/validate-contrast.js';
import { validateRoles } from './utils/validate-roles.js';
import { validateStates } from './utils/validate-states.js';
import type { ColorRole, Theme } from './tokens.types.js';
import type { ThemeViolation } from './validate.types.js';

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

// `ThemeViolation` moved to `validate.types.ts` with every other type in this
// package. Re-exported because it is part of this subpath's public API.
export type { ContrastAdvisory, ThemeViolation } from './validate.types.js';

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
