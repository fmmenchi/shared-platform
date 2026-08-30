/**
 * Public theme validation — what makes a theme "allowed", as executable code.
 *
 * Apps that ship a brand preset should run this in their own CI:
 *
 *   import { validateTheme } from '@fmmenchi/tokens/validate';
 *   expect(validateTheme(myBrandColors)).toEqual([]);
 *
 * A theme must assign every color role with a parsable color (RESOLVED
 * literals, not var() references), and every declared pair must clear BOTH hard
 * floors: WCAG AA, and an APCA |Lc| of 45 on text pairs.
 *
 * APCA lives here rather than in a test, and that move is the point. The policy
 * was always both — WCAG 2.x is a blunt instrument on dark themes, which is
 * exactly the case a generated theme gets wrong — but only the WCAG half was in
 * this function, while `tokens.test.ts` enforced the APCA floor separately. So
 * the pipeline demanded more than the public verdict, and a generated theme
 * could pass a builder calling `validateTheme()` and then fail the repository's
 * own gate. One question, asked in one place, is what makes a preview's promise
 * worth anything (ADR-0033).
 *
 * The |Lc| 60 body-text guideline stays ADVISORY and is reported by
 * `themeAdvisories()`, not returned here: 60 is guidance for body copy, and the
 * smallest text in this system is a medium-weight button label.
 * The reference presets pass this exact validator (see `tokens.test.ts`).
 *
 * Subpath entry (`@fmmenchi/tokens/validate`) so the browser import graph of
 * the main entry never pulls the color math in.
 */
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import {
  converter,
  displayable,
  parse as parseColor,
  wcagContrast,
} from 'culori';
// FROM THE MODULES, not from the barrel. This file is a separate subpath so a
// browser importing the main entry never pulls the colour maths in; importing
// `./index.js` ran that coupling backwards, so every addition to the barrel —
// `tokenVars` was the latest — widened `@fmmenchi/tokens/validate` too.
import { ACTION_FAMILIES, COLOR_ROLES, STATUS_FAMILIES } from '../tokens.js';
import type { ColorRole } from '../types/tokens.types.js';
import type { ThemeAdvisory, ThemeViolation } from '../types/validate.types.js';

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
export type { ThemeAdvisory, ThemeViolation } from '../types/validate.types.js';

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
