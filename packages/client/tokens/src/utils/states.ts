/**
 * DO THE STATES STILL LOOK LIKE STATES?
 *
 * The checks that no single value can fail — they are about RELATIONSHIPS
 * between roles, which is the failure mode a palette of static literals has and
 * cannot drift-check on its own. Every value here can be individually perfect
 * while the set is wrong.
 *
 * Two of them, and both are about a state being distinguishable from its rest
 * state: hover and active must move, and move the right way; disabled must look
 * disabled even though WCAG 1.4.3 exempts it from contrast.
 */
import { converter, parse as parseColor } from 'culori';

import { ACTION_FAMILIES } from '../tokens.js';
import type { ThemeViolation } from '../theme.types.js';

type Parsed = NonNullable<ReturnType<typeof parseColor>>;

const toOklch = converter('oklch');

/** How far a state may sit from its rest fill before it reads as the same. */
const SAME_AS_REST = 0.02;
/** Disabled is allowed to be subtle, but not invisible. */
const SAME_AS_ENABLED = 0.03;

export function stateViolations(
  parsable: ReadonlyMap<string, Parsed>,
): ThemeViolation[] {
  const violations: ThemeViolation[] = [];

  const lightnessOf = (role: string): number | undefined => {
    const parsed = parsable.get(role);
    return parsed ? toOklch(parsed).l : undefined;
  };

  // Polarity anchors on the page surface: a light page darkens its states, a
  // dark page lightens them. Read from the theme rather than declared, so a
  // consumer who puts a dark palette on `:root` is judged by what they shipped.
  const backgroundL = lightnessOf('background');
  const darkens = backgroundL !== undefined && backgroundL >= 0.5;

  for (const family of ACTION_FAMILIES) {
    const base = lightnessOf(family);
    if (base === undefined) continue;

    for (const state of ['hover', 'active'] as const) {
      const stateL = lightnessOf(`${family}-${state}`);
      if (stateL === undefined) continue;
      const delta = stateL - base;

      if (Math.abs(delta) < SAME_AS_REST) {
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

    const disabledL = lightnessOf(`${family}-disabled`);
    if (
      disabledL !== undefined &&
      Math.abs(disabledL - base) < SAME_AS_ENABLED
    ) {
      violations.push({
        kind: 'indistinct-disabled',
        role: `${family}-disabled`,
        message: `"${family}-disabled" is indistinguishable from "${family}" (ΔL ${(disabledL - base).toFixed(3)})`,
      });
    }
  }

  return violations;
}
