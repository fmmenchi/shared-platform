/**
 * THE FOUR PRIMITIVES over a theme.
 *
 *   parseTheme(...css)   stylesheets  -> the `--fm-*` declarations in them
 *   toTheme(declared)    declarations -> a theme: every role, resolved
 *   toCssVars(theme)     a theme      -> a stylesheet
 *   validateTheme(theme) a theme      -> what is wrong with it
 *
 * A pipeline in one direction and one function back out. They are separate
 * because the middle step is where the interesting failure lives: a stylesheet
 * can be read fine and still not describe a theme, and a theme can be complete
 * and still be unusable. Collapsing parse and resolve into one call would have
 * hidden which of the two went wrong.
 *
 * `toTheme` is not new work so much as work that was being done twice by hand:
 * `tokens.test.ts` held two identical copies of it. Two copies of a resolve, in
 * the file that guards the contract, is how a gate ends up checking something
 * other than what ships.
 */
import { colorVar, COLOR_ROLES } from '../contract/tokens.js';
import type { ColorRole, Theme } from '../contract/tokens.types.js';
import { readVars } from './read-vars.js';
import { resolveValue } from './resolve.js';

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
    for (const [name, value] of readVars(css)) declared.set(name, value);
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
    if (raw !== undefined) theme[role] = resolveValue(raw, declared);
  }
  return theme;
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

/**
 * The fourth primitive, defined in `validations/validate.ts` and re-exported
 * here so all four are reachable from one import.
 *
 * It lives there because it is the CONTRACT's verdict — what makes a theme
 * allowed is true of any theme however it was built, and a consumer validating a
 * hand-written preset should not have to know where the parser lives. But
 * splitting the four operations across two entry points made them hard to find,
 * which is a worse problem than the one that split bought.
 */
export { validateTheme, themeAdvisories } from './validate.js';
export type { ThemeViolation, ThemeAdvisory } from './validate.types.js';
