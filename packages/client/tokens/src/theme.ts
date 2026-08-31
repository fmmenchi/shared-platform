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
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import {
  converter,
  displayable,
  parse as parseColor,
  wcagContrast,
} from 'culori';

import { readVars, resolveValue } from './css.js';
import {
  ACTION_FAMILIES,
  COLOR_ROLES,
  STATUS_FAMILIES,
  colorVar,
} from './tokens.js';
import type { ColorRole, Theme } from './tokens.types.js';
import type { ThemeAdvisory, ThemeViolation } from './theme.types.js';

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
 * The DECLARED PAIRS — the only role combinations the design system
 * guarantees. Components may set a foreground on a background ONLY when the
 * pairing is declared here; a component that introduces a new pairing must add
 * it (and every theme re-validates against it). `-disabled` pairs are exempt
 * (WCAG 1.4.3 exception).
 */
export const CONTRAST_PAIRS: ReadonlyArray<
  readonly [bg: ColorRole, fg: ColorRole, minimum: number]
> = [
  ...[...ACTION_FAMILIES, ...STATUS_FAMILIES, 'neutral' as const].flatMap(
    (f) =>
      [
        [f, `${f}-foreground`, 4.5],
        [`${f}-subtle`, `${f}-subtle-foreground`, 4.5],
      ] as const,
  ),
  ...ACTION_FAMILIES.flatMap(
    (f) =>
      [
        [`${f}-hover`, `${f}-foreground`, 4.5],
        [`${f}-active`, `${f}-foreground`, 4.5],
      ] as const,
  ),
  ['background', 'foreground', 4.5],
  // Ghost treatment (quiet on surface roles): default text stays `foreground`
  // while the hover/active surfaces are the soft washes — so these pairings
  // are part of the guarantee, not incidental.
  ['muted', 'foreground', 4.5],
  ['neutral-subtle', 'foreground', 4.5],
  ['card', 'card-foreground', 4.5],
  ['popover', 'popover-foreground', 4.5],
  ['muted', 'muted-foreground', 4.5],
  ['background', 'muted-foreground', 4.5],
  ['input', 'input-foreground', 4.5],
  ['background', 'ring', 3], // non-text focus indicator (WCAG 1.4.11)
  // Focus lands inside raised surfaces too (an input in a Dialog, a menu item
  // in a Popover) — the ring must clear 3:1 on every surface it can appear on.
  ['card', 'ring', 3],
  ['popover', 'ring', 3],
  ['input', 'input-invalid', 3], // non-text invalid signal on the field
  ['background', 'input-border', 3], // control boundary vs the page (WCAG 1.4.11)
  // A checked radio/checkbox paints its mark in `primary` (via `accent-color`).
  // That mark is the ONLY thing distinguishing checked from unchecked, so it is a
  // non-text state indicator and owes 3:1 against the page (WCAG 1.4.11) — the
  // fill/foreground pair above says nothing about how the control reads on it.
  ['background', 'primary', 3],
  // A fill against its groove — `Progress`'s bar, and `Slider`'s fill and
  // thumb, which share the pairing on purpose ("how far along" is one
  // vocabulary). The fill is the ONLY thing telling how far along from how far
  // to go, so it is a non-text indicator and owes 3:1 (WCAG 1.4.11); no other
  // component makes this pairing, since `muted` is elsewhere a surface for
  // text rather than a track under a fill.
  ['muted', 'primary', 3],
  // And a SELECTED TABLE ROW repaints the surface under that mark. `Table`
  // tints the row `primary-subtle`, so the checked box — which the component
  // insists is the only thing carrying the selected state, since `aria-selected`
  // says nothing inside a `table` — now reads against the tint rather than the
  // page, and so does the focus ring that lands on it. Both cleared 3:1 in the
  // reference theme when the row shipped; neither was declared, so no theme was
  // held to it and the check that would have caught a drift did not exist.
  ['primary-subtle', 'primary', 3],
  ['primary-subtle', 'ring', 3],
  ['background', 'link', 4.5],
  ['background', 'link-hover', 4.5],
  // Links render inside cards/alerts/popovers, not only on the page.
  ['card', 'link', 4.5],
  ['popover', 'link', 4.5],
  ['muted', 'link', 4.5],
  // Status fills double as inline status TEXT on the page ("2 errors" in
  // destructive/success/… colour) — so they must be readable as text. `error`
  // is the field-error message colour (Field).
  ['background', 'success', 4.5],
  ['background', 'warning', 4.5],
  ['background', 'info', 4.5],
  ['background', 'error', 4.5],
  ['selection', 'selection-foreground', 4.5],
  ['tooltip', 'tooltip-foreground', 4.5],
  ['input', 'input-placeholder', 4.5], // placeholder is text
  ...(['success', 'warning', 'info', 'error', 'neutral'] as const).map(
    (f) => [`${f}-subtle`, `${f}-border`, 3] as const, // tinted alert border
  ),
] as ReadonlyArray<readonly [ColorRole, ColorRole, number]>;

// `ThemeViolation` moved to `validate.types.ts` with every other type in this
// package. Re-exported because it is part of this subpath's public API.
export type { ThemeAdvisory, ThemeViolation } from './theme.types.js';

/** WCAG AA for text. The pairs declaring this are the ones APCA also judges. */
const TEXT_RATIO = 4.5;
/** APCA hard floor: the large/bold tier, our smallest text being button labels. */
const APCA_FLOOR = 45;
/** APCA body-text guideline. Advisory — reported, never failed. */
const APCA_GUIDELINE = 60;

/**
 * |Lc| for a foreground on a background, or `undefined` if either is unreadable.
 *
 * APCA takes sRGB bytes, so the colours are converted and clamped the way a
 * display would. Absolute because only the magnitude is a floor; the sign
 * encodes which way round the pair is.
 */
function lightnessContrast(
  foreground: string | undefined,
  background: string | undefined,
): number | undefined {
  if (foreground === undefined || background === undefined) return undefined;
  const toRgb = converter('rgb');
  const y = (value: string): number | undefined => {
    const parsed = parseColor(value);
    if (!parsed) return undefined;
    const { r, g, b } = toRgb(parsed);
    const byte = (x: number) => Math.min(255, Math.max(0, Math.round(x * 255)));
    return sRGBtoY([byte(r), byte(g), byte(b)]);
  };
  const fg = y(foreground);
  const bg = y(background);
  if (fg === undefined || bg === undefined) return undefined;
  return Math.abs(Number(APCAcontrast(fg, bg)));
}

/**
 * Pairs that clear both hard floors but sit under the APCA body-text guideline.
 *
 * Separate from `validateTheme()` so that returning `[]` keeps meaning "allowed":
 * an advisory is something to look at, not a reason to refuse a theme.
 */
export function themeAdvisories(
  colors: Readonly<Record<string, string>>,
): ThemeAdvisory[] {
  const advisories: ThemeAdvisory[] = [];
  for (const [bg, fg, minimum] of CONTRAST_PAIRS) {
    if (minimum !== TEXT_RATIO) continue;
    const lc = lightnessContrast(colors[fg], colors[bg]);
    if (lc === undefined || lc < APCA_FLOOR || lc >= APCA_GUIDELINE) continue;
    advisories.push({
      pair: [bg, fg],
      lc,
      guideline: APCA_GUIDELINE,
      message: `${bg} × ${fg}: |Lc| ${lc.toFixed(1)} (< ${APCA_GUIDELINE} body-text guideline)`,
    });
  }
  return advisories;
}

/**
 * Validate a complete color-role assignment. Returns [] when the theme is
 * allowed; otherwise one violation per problem (completeness, stray roles,
 * unparsable values, failed pairs).
 */
export function validateTheme(
  colors: Readonly<Record<string, string>>,
): ThemeViolation[] {
  const violations: ThemeViolation[] = [];
  const known = new Set<string>(COLOR_ROLES);

  for (const role of COLOR_ROLES) {
    if (!(role in colors)) {
      violations.push({
        kind: 'missing-role',
        role,
        message: `missing color role "${role}"`,
      });
    }
  }
  for (const key of Object.keys(colors)) {
    if (!known.has(key)) {
      violations.push({
        kind: 'unknown-role',
        role: key,
        message: `unknown color role "${key}"`,
      });
    }
  }

  const parsable = new Map<
    string,
    NonNullable<ReturnType<typeof parseColor>>
  >();
  for (const role of COLOR_ROLES) {
    const value = colors[role];
    if (value === undefined) continue;
    const parsed = parseColor(value);
    if (!parsed) {
      violations.push({
        kind: 'unparsable-color',
        role,
        message: `"${role}" is not a parsable color: ${value}`,
      });
    } else if (!displayable(parsed)) {
      // Out-of-sRGB values render differently per browser (each gamut-maps
      // its own way) and silently falsify contrast math — a theme must ship
      // sRGB-displayable literals (clamp chroma at constant lightness).
      violations.push({
        kind: 'out-of-gamut',
        role,
        message: `"${role}" is outside the sRGB gamut: ${value}`,
      });
      parsable.set(role, parsed); // still contrast-check with the parsed value
    } else {
      parsable.set(role, parsed);
    }
  }

  for (const [bg, fg, minimum] of CONTRAST_PAIRS) {
    const b = parsable.get(bg);
    const f = parsable.get(fg);
    if (!b || !f) continue; // already reported above
    const ratio = wcagContrast(b, f);
    if (ratio < minimum) {
      violations.push({
        kind: 'contrast',
        pair: [bg, fg],
        ratio,
        minimum,
        message: `${bg} × ${fg}: ${ratio.toFixed(2)} < ${minimum}`,
      });
    }

    // Text pairs carry the second floor. Ring and non-text pairs (minimum 3) do
    // not: APCA's tiers are about reading, and a focus ring is not read.
    if (minimum === TEXT_RATIO) {
      const lc = lightnessContrast(colors[fg], colors[bg]);
      if (lc !== undefined && lc < APCA_FLOOR) {
        violations.push({
          kind: 'apca',
          pair: [bg, fg],
          lc,
          lcFloor: APCA_FLOOR,
          message: `${bg} × ${fg}: |Lc| ${lc.toFixed(1)} < ${APCA_FLOOR}`,
        });
      }
    }
  }

  // ---- Relational checks: the static-literal methodology's failure modes ----
  // Static values can't drift-check themselves, so the validator asserts the
  // RELATIONSHIPS a theme must keep, not just each value in isolation.
  const toOklch = converter('oklch');
  const lightnessOf = (role: string): number | undefined => {
    const parsed = parsable.get(role);
    return parsed ? toOklch(parsed).l : undefined;
  };

  // Theme polarity anchors on the page surface: light page → states darken,
  // dark page → states lighten (the graded-ramp methodology).
  const backgroundL = lightnessOf('background');
  const darkens = backgroundL !== undefined && backgroundL >= 0.5;

  for (const family of ACTION_FAMILIES) {
    const base = lightnessOf(family);
    if (base === undefined) continue;
    for (const state of ['hover', 'active'] as const) {
      const stateL = lightnessOf(`${family}-${state}`);
      if (stateL === undefined) continue;
      const delta = stateL - base;
      if (Math.abs(delta) < 0.02) {
        violations.push({
          kind: 'state-ramp',
          role: `${family}-${state}`,
          message: `"${family}-${state}" is indistinguishable from "${family}" (ΔL ${delta.toFixed(3)})`,
        });
      } else if (darkens ? delta > 0 : delta < 0) {
        violations.push({
          kind: 'state-ramp',
          role: `${family}-${state}`,
          message: `"${family}-${state}" ramps the wrong way for a ${darkens ? 'light' : 'dark'} theme (ΔL ${delta.toFixed(3)})`,
        });
      }
    }

    // Disabled is contrast-exempt (WCAG 1.4.3) but must still LOOK disabled:
    // a fill indistinguishable from the enabled one fails the state, not AA.
    const disabledL = lightnessOf(`${family}-disabled`);
    if (disabledL !== undefined && Math.abs(disabledL - base) < 0.03) {
      violations.push({
        kind: 'indistinct-disabled',
        role: `${family}-disabled`,
        message: `"${family}-disabled" is indistinguishable from "${family}" (ΔL ${(disabledL - base).toFixed(3)})`,
      });
    }
  }

  return violations;
}
