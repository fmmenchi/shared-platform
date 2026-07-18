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
import { parse as parseColor, wcagContrast } from 'culori';
import {
  ACTION_FAMILIES,
  COLOR_ROLES,
  STATUS_FAMILIES,
  type ColorRole,
} from './index.js';

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
  ['card', 'card-foreground', 4.5],
  ['popover', 'popover-foreground', 4.5],
  ['muted', 'muted-foreground', 4.5],
  ['background', 'muted-foreground', 4.5],
  ['input', 'input-foreground', 4.5],
  ['background', 'ring', 3], // non-text focus indicator (WCAG 1.4.11)
  ['input', 'input-invalid', 3], // non-text invalid signal on the field
] as ReadonlyArray<readonly [ColorRole, ColorRole, number]>;

export interface ThemeViolation {
  kind: 'missing-role' | 'unknown-role' | 'unparsable-color' | 'contrast';
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

  return violations;
}
