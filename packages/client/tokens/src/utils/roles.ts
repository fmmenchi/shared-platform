/**
 * IS EVERY ROLE THERE, AND IS EACH ONE A COLOUR THE BROWSER CAN PAINT?
 *
 * The three checks that look at values one at a time — present, parsable, inside
 * the gamut — and the one that produces what the other checks need: the parsed
 * colours. Parsing and reporting are the same pass, so they are one function
 * rather than two that would each have to parse.
 */
import { displayable, parse as parseColor } from 'culori';

import { COLOR_ROLES } from '../tokens.types.js';
import type { ThemeViolation } from '../theme.types.js';

type Parsed = NonNullable<ReturnType<typeof parseColor>>;

export interface ParsedColors {
  /** Every role that parsed, by name — what the contrast checks measure. */
  readonly parsable: ReadonlyMap<string, Parsed>;
  readonly violations: readonly ThemeViolation[];
}

/**
 * Parse a theme's colours, reporting what is missing, stray or unpaintable.
 *
 * An OUT-OF-GAMUT value is reported and still returned: out-of-sRGB renders
 * differently per browser, each gamut-mapping its own way, so it silently
 * falsifies contrast maths — but dropping it would hide every pair it takes part
 * in behind a second, quieter failure.
 */
export function parseColors(
  colors: Readonly<Record<string, string>>,
): ParsedColors {
  const violations: ThemeViolation[] = [];
  const parsable = new Map<string, Parsed>();
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
      continue;
    }
    if (!displayable(parsed)) {
      violations.push({
        kind: 'out-of-gamut',
        role,
        message: `"${role}" is outside the sRGB gamut: ${value}`,
      });
    }
    parsable.set(role, parsed);
  }

  return { parsable, violations };
}
