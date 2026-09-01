import {
  generateTheme,
  validateTheme,
  type Declarations,
} from '@fmmenchi/theme';

import type { Bases } from './bases';
import { buildRamp, type RampShape } from './ramp';

/**
 * ASKING THE CONTRACT, RATHER THAN ASSERTING WHAT IT WOULD SAY.
 *
 * The design system's dark end is 0.26 because that is what 144 synthetic worst-case
 * brands require — 24 hues x 3 chroma levels x 2 lightnesses, every family given the
 * same base. It ships to brands it has not seen, so it has no choice but to take the
 * strictest of them.
 *
 * This wizard is in the opposite position: it knows the seven actual bases. So the
 * honest control is not "here is a slider, mind the guarantee" and not "0.26 or
 * nothing" — it is to RUN THE REAL VALIDATOR on the theme each option would produce
 * and offer the ones that pass. A brand whose bases are forgiving gets a visibly less
 * black dark end; a brand whose bases are not is told so, by the same function CI
 * runs, with the failing pair named.
 *
 * THE SAME PROBE ANSWERS BOTH ENDS, which is why this is one function rather than
 * two. The pale end cannot currently fail — nothing points at the 25 or the 50, the
 * `-subtle` roles all name the 100 — but "cannot currently" is a fact about today's
 * alias map, not a property of the wizard. Re-point `-subtle` at the 50 and a shape
 * with `paleRungs: 0` starts naming a rung that does not exist; `generateTheme` throws
 * for exactly that, and this reports it as an unavailable option instead of as a crash
 * on step 3. A control that keeps itself right when the design system changes is worth
 * more than one that is right today.
 *
 * IT IS NOT CHEAP and it is not meant to be called per render. `generateTheme` builds
 * a whole palette — `generatePalette` bisects each rung into sRGB — and
 * `validateTheme` measures every declared pair; per shape that is one theme and
 * eighty-four roles. Memoise on the bases, which is what `palette.tsx` does.
 */
export interface ShapeVerdict {
  readonly shape: RampShape;
  /** Whether a theme built on this shape passes the contract for THESE bases. */
  readonly allowed: boolean;
  /**
   * Why not, when it is not — the validator's own first message, or the hole
   * `generateTheme` refused to leave. Empty when allowed.
   *
   * THE FIRST ONE AND NOT ALL OF THEM. A dark end that fails tends to fail wide: at
   * 0.34 the reference bases break dozens of pairs, and a control offering an option
   * cannot show dozens of reasons. The first is enough to say what kind of problem it
   * is, and step 3 shows every pair with its measured ratio for the shape actually
   * chosen.
   */
  readonly reason?: string;
}

/**
 * Whether these bases can carry that shape, and what stops them if they cannot.
 *
 * NEVER THROWS. `generateTheme` throws on a hole, which is right for a build step and
 * wrong for a probe: the caller is asking a question, and an option that cannot be
 * built is an answer rather than an error. Caught and reported.
 */
export function probeShape(
  declared: Declarations,
  bases: Bases,
  shape: RampShape,
): ShapeVerdict {
  let violations;

  try {
    violations = validateTheme(
      generateTheme(declared, bases, buildRamp(shape)),
    );
  } catch (error) {
    return {
      shape,
      allowed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const first = violations[0];

  return first
    ? { shape, allowed: false, reason: first.message }
    : { shape, allowed: true };
}
