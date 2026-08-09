/**
 * Public theme validation — what makes a theme "allowed", as executable code.
 *
 * Apps that ship a brand preset should run this in their own CI:
 *
 *   import { validateTheme } from '@fmmenchi/tokens/validate';
 *   expect(validateTheme(myBrandColors)).toEqual([]);
 *
 * A theme must assign every color role with a parsable color (RESOLVED
 * literals, not var() references) and every declared pair must meet WCAG AA.
 * The reference presets pass this exact validator (see `tokens.test.ts`).
 *
 * Subpath entry (`@fmmenchi/tokens/validate`) so the browser import graph of
 * the main entry never pulls the color math in.
 */
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
import { ACTION_FAMILIES, COLOR_ROLES, STATUS_FAMILIES } from './tokens.js';
import type { ColorRole } from './tokens.types.js';

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
  ['background', 'ring', 3],
  // THE FOCUS RING ON A STATUS TINT — the toast's dismiss button sits inside a
  // coloured `Alert`, so its ring is drawn on `<status>-subtle` rather than on
  // a surface. WCAG 1.4.11, and the rule this package states: a component
  // introducing a pairing adds it here, or no theme is ever checked for it.
  ['success-subtle', 'ring', 3],
  ['warning-subtle', 'ring', 3],
  ['info-subtle', 'ring', 3],
  ['error-subtle', 'ring', 3], // non-text focus indicator (WCAG 1.4.11)
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

export interface ThemeViolation {
  kind:
    | 'missing-role'
    | 'unknown-role'
    | 'unparsable-color'
    | 'out-of-gamut'
    | 'contrast'
    | 'state-ramp'
    | 'indistinct-disabled';
  role?: string;
  pair?: readonly [string, string];
  ratio?: number;
  minimum?: number;
  message: string;
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
