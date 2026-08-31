/**
 * THE ENTRYPOINTS — everything you can do with a theme.
 *
 *   parseTheme(...css)                    stylesheets  -> the `--fm-*` declarations
 *   toTheme(declared)                     declarations -> a theme, every role resolved
 *   generateTheme(declared, bases, ramp)  a BRAND      -> a theme
 *   validateTheme(theme)                  a theme      -> what is wrong with it
 *
 * Reading one way, building the other, and one function to judge the result. They
 * are separate because each failure is different in kind: a stylesheet can be read
 * fine and still not describe a theme, and a theme can be complete and still be
 * unusable. Collapsing parse and resolve into one call would hide which went wrong.
 *
 * IT IS ONE FILE because a theme is one subject, which is the pattern `palette.ts`
 * already follows — it holds `generatePalette` and `toPalette` and their types
 * together. `generateTheme` briefly had a `generate-theme.ts` of its own, which put
 * three of the four verbs here and the fourth in a file with the same word in its
 * name, split on no principle anybody could state.
 *
 * NOTHING IS IMPLEMENTED HERE beyond composing what `utils/` and `palette.ts`
 * provide. That is the point of the file: opening it should answer "what can I do",
 * not "how does contrast work". Each area lives with its own kind — reading CSS,
 * measuring contrast, judging states — so a reader looking for one is not reading
 * the others on the way.
 */
import { formatCss, parse as parseColor } from 'culori';

import { generatePalette, toPalette } from './palette.js';
import { parseCssVars, resolveCssVar } from './utils/parse-css.js';
import { readAliases } from './utils/read-aliases.js';
import { COLOR_ROLES, PALETTE_FAMILIES, colorVar } from './tokens.types.js';
import { validateContrast } from './utils/validate-contrast.js';
import { validateRoles } from './utils/validate-roles.js';
import { validateStates } from './utils/validate-states.js';
import type { Bases, Ramp } from './palette.js';
import type { ColorRole, Theme } from './tokens.types.js';
import type { Declarations, ThemeViolation } from './theme.types.js';

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
export function parseTheme(...sources: readonly string[]): Declarations {
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
export function toTheme(declared: Declarations): Partial<Theme> {
  const theme: Partial<Record<ColorRole, string>> = {};
  for (const role of COLOR_ROLES) {
    const raw = declared.get(colorVar(role));
    if (raw !== undefined) theme[role] = resolveCssVar(raw, declared);
  }
  return theme;
}

/**
 * The theme a BRAND produces: seven colours in, 84 resolved roles out.
 *
 * IT TAKES EVERYTHING, and that is the correction worth recording. The first
 * version was `generateTheme(palette, aliases)`, which made the caller do four
 * steps for one question — read the aliases from the stylesheet, read the greys the
 * stylesheet states, generate the brand's ramps, merge the two halves in the right
 * order — and every one of them was a chance to assemble it wrong. The wizard got it
 * wrong immediately: it omitted the greys, and since 34 of the 84 roles point at
 * them, the function threw for EVERY possible set of bases, the shipped ones
 * included. A signature that is easy to misuse got used that way on its first day.
 *
 * So the three inputs are the three things a theme actually needs, and none of them
 * is derived from another:
 *
 *   declared  the stylesheet's own declarations — WHERE each role points, and the
 *             greys no brand supplies (ADR-0032: they are stated, because no single
 *             base spans 1.00 to 0.05 and still resolves the pale end)
 *   bases     the brand's seven chromatic colours
 *   ramp      the policy placing rungs under each base
 *
 * READ RATHER THAN WRITTEN, all of it. The alias map is the design work and it
 * already lives in `vars.css`; a table of it here would be one decision in two
 * files, obliged to agree forever. It also means the map is the CONSUMER'S: the Nx
 * generator reads the `@fmmenchi/tokens` installed in their workspace, so a theme it
 * builds points roles the way that version does, and a house wanting different
 * placements writes a stylesheet rather than a fork.
 *
 * THERE IS NOTHING TO SOLVE HERE, measured before it was written: read off the
 * shipped themes, all 84 roles land EXACTLY on a rung — ΔE 0.0000, not "close" —
 * with one exception, `scrim`, which is a rung plus alpha. No search, no contrast
 * probing, because `generatePalette` places rungs at absolute lightness (ADR-0033),
 * so a role that clears its floor at a given step clears it for every brand.
 *
 * `validateTheme` still runs afterwards and it is not ceremony: a brand may hand
 * over a base whose gamut clamps a rung out of range, and then a pair that cleared
 * its floor for one brand does not for this one. It judges a result; it does not
 * produce one.
 *
 * IT RETURNS A COMPLETE THEME OR THROWS, and the first version did neither: it
 * returned `Partial<Theme>`, on the theory that a caller might want part of one.
 * No caller ever did, and the cost was visible at every call site — eight casts,
 * including `validateTheme(theme as Record<string, string>)`, because a partial
 * theme does not satisfy the validator that judges themes. **A signature that
 * forces a cast wherever it is used is describing something other than what the
 * function does.**
 *
 * A ROLE THAT IS NOT AN ALIAS IS CARRIED THROUGH, resolved. A stylesheet may state
 * a colour outright — a hand-written brand preset does — and such a role does not
 * depend on the brand at all, so the honest thing is to keep what it says rather
 * than to drop it and call the result partial.
 *
 * THROWS on either kind of hole, listing every one:
 *
 *   - a rung the palette does not have. The usual cause is a ramp that does not
 *     reach the steps the stylesheet names — a nine-rung ramp cannot serve a map
 *     written against thirteen.
 *   - a role the stylesheet does not declare at all.
 *
 * Both matter because an undefined role resolves to its `@property` initial-value —
 * opaque black, in both themes, with nothing falsy to branch on — so the hole would
 * survive every check that inspects what is present.
 */
export function generateTheme(
  declared: Declarations,
  bases: Bases,
  ramp: Ramp,
): Theme {
  // The two halves of a complete palette: the families the stylesheet STATES
  // underneath — the greys — and the brand's seven generated over the top. Filtered
  // rather than merged wholesale, because `toPalette` resolves every declared family
  // and the seven chromatic ones would be overwritten in the same breath.
  const brand = new Set<string>(PALETTE_FAMILIES);
  const stated = Object.fromEntries(
    Object.entries(toPalette(declared)).filter(
      ([family]) => !brand.has(family),
    ),
  );
  const palette = { ...stated, ...generatePalette(bases, ramp) };

  const aliases = readAliases(declared);
  const theme: Partial<Record<ColorRole, string>> = {};
  const holes: string[] = [];

  // EVERY role, not every alias. Driven by `COLOR_ROLES` so the result is complete
  // by construction — the previous version iterated the aliases, which is why it
  // could only promise a partial theme.
  for (const role of COLOR_ROLES) {
    const alias = aliases.get(role);

    if (alias === undefined) {
      // Not an alias: the stylesheet either states a colour outright, which is
      // legitimate and does not depend on the brand, or says nothing at all.
      const raw = declared.get(colorVar(role));
      if (raw === undefined) {
        holes.push(`${role} (not declared)`);
        continue;
      }
      theme[role] = resolveCssVar(raw, declared);
      continue;
    }

    const { family, step, alpha } = alias;
    const rung = palette[family]?.[step];
    if (rung === undefined) {
      holes.push(`${role} -> ${family}-${step} (no such rung)`);
      continue;
    }

    if (alpha === undefined) {
      theme[role] = rung;
      continue;
    }

    // A rung seen through something. Parsed and re-formatted rather than string
    // surgery, because the rung's own notation is `generatePalette`'s to change and
    // this should not know what it looks like.
    const parsed = parseColor(rung);
    if (!parsed) {
      holes.push(`${role} -> ${family}-${step} (rung is not a colour)`);
      continue;
    }
    theme[role] = formatCss({ ...parsed, alpha });
  }

  if (holes.length > 0) {
    throw new Error(
      `Cannot generate ${holes.length} of ${COLOR_ROLES.length} role(s): ${holes.join(', ')}.`,
    );
  }

  // Every role was assigned or the throw above fired, so this is a whole theme.
  return theme as Theme;
}

// `ThemeViolation` moved to `theme.types.ts` with every other type in this
// package. Re-exported because it is part of this subpath's public API.
export type {
  ContrastAdvisory,
  Declarations,
  ThemeViolation,
} from './theme.types.js';

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
