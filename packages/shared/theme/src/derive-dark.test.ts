import { converter, displayable, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { PALETTE_FAMILIES } from './tokens.types.js';
import { deriveDarkBases, type Bases } from './palette.js';

/**
 * DERIVING A DARK BASE — the seven colours a brand does not hand over.
 *
 * A dark theme restates its bases rather than inverting the light ones, because at
 * lightness 0.75 a colour needs different chroma to read as the same colour it was at
 * 0.55. So a wizard given seven brand colours has to produce fourteen.
 *
 * THE RULE CARRIES THE SHARE, NOT THE NUMBER, and that is the whole of it: how much
 * of the chroma sRGB allows at its lightness does this base actually take? Measured on
 * the design system's own light bases, six of seven answer between 77.6% and 79.2%,
 * which is why the share is the thing worth preserving. An absolute chroma is not —
 * 0.14 is 78% of the ceiling at L 0.55 and about 54% of it at 0.75, so keeping the
 * number would desaturate every family on the way to the dark theme.
 */
const REFERENCE: Bases = {
  primary: 'oklch(55% 0.1406 255)',
  secondary: 'oklch(57% 0.0521 256)',
  accent: 'oklch(54% 0.0708 195)',
  negative: 'oklch(57% 0.1823 27)',
  success: 'oklch(55% 0.1167 150)',
  warning: 'oklch(60% 0.099 78)',
  info: 'oklch(56% 0.1094 245)',
};

const toOklch = converter('oklch');
const at = (css: string) => toOklch(parse(css));

describe('deriveDarkBases', () => {
  it('restates every family at the target lightness', () => {
    const dark = deriveDarkBases(REFERENCE);

    for (const family of PALETTE_FAMILIES) {
      expect(at(dark[family])?.l, family).toBeCloseTo(0.75, 3);
    }
  });

  it('carries the HUE untouched', () => {
    // A brand's blue is its blue at any lightness. The one hand-picked dark base that
    // had moved (`warning`, +4 degrees) is a designer nudging one colour, not a rule.
    const dark = deriveDarkBases(REFERENCE);

    for (const family of PALETTE_FAMILIES) {
      expect(at(dark[family])?.h, family).toBeCloseTo(
        at(REFERENCE[family])?.h ?? 0,
        1,
      );
    }
  });

  it('preserves each base’s SHARE of the gamut, not its chroma', () => {
    // THE ONE THAT PINS THE RULE. Both properties are asserted together on purpose:
    // that the share is kept, and that the chroma therefore is NOT — a test of the
    // first alone would pass for "keep the chroma" at any lightness where the ceiling
    // happens to be similar.
    const dark = deriveDarkBases(REFERENCE);

    const ceiling = (l: number, h: number) => {
      let low = 0;
      let high = 0.5;
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        if (displayable({ mode: 'oklch', l, c: mid, h })) low = mid;
        else high = mid;
      }
      return low;
    };

    for (const family of PALETTE_FAMILIES) {
      const light = at(REFERENCE[family]);
      const derived = at(dark[family]);
      const lightShare =
        (light?.c ?? 0) / ceiling(light?.l ?? 0, light?.h ?? 0);
      const darkShare = (derived?.c ?? 0) / ceiling(0.75, derived?.h ?? 0);

      expect(darkShare, `${family} share`).toBeCloseTo(lightShare, 2);
    }

    // …and `success` is the family where the two rules visibly disagree: its ceiling
    // at 0.75 is far higher than at 0.55, so keeping the share GAINS chroma where
    // keeping the number would have lost it.
    expect(at(dark.success)?.c ?? 0).toBeGreaterThan(
      at(REFERENCE.success)?.c ?? 0,
    );
  });

  it('never leaves sRGB', () => {
    const dark = deriveDarkBases(REFERENCE);

    for (const family of PALETTE_FAMILIES) {
      expect(displayable(dark[family]), `${family}: ${dark[family]}`).toBe(
        true,
      );
    }
  });

  it('THROWS on a base that is not a colour', () => {
    // Rather than emitting a family of `NaN`, which is the failure a caller cannot
    // see: a palette that looks generated and paints nothing.
    expect(() =>
      deriveDarkBases({ ...REFERENCE, primary: 'not a colour' }),
    ).toThrow(/primary/);
  });

  it('takes the target lightness as an argument, defaulting to 0.75', () => {
    // 0.75 is where the shipped dark preset states its bases, and it is a VALUE — so
    // it is a default here rather than a constant this package owns.
    expect(at(deriveDarkBases(REFERENCE, 0.8).primary)?.l).toBeCloseTo(0.8, 3);
  });
});
