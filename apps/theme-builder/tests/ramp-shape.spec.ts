import { generatePalette } from '@fmmenchi/theme';
import { displayable } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { probeShape } from '../app/ramp-probe';
import {
  DARK_END_CHOICES,
  REFERENCE_RAMP,
  REFERENCE_SHAPE,
  buildRamp,
} from '../app/ramp';
import { DECLARED, FAMILY_NAMES, GRID } from './grid';

/**
 * THE SHAPE A PERSON MAY MOVE — step two's ramp control, and what keeps it honest.
 *
 * `ramp.spec.ts` holds the shipped numbers: evenly spaced, dark end as light as the
 * universal guarantee allows, reproduces `vars.css` fed the shipped bases. This file
 * is about the OTHER shapes, the ones the wizard offers once someone touches an end.
 *
 * Three claims, and none of them is self-evident from the code:
 *
 *   1. leaving the control alone changes nothing — otherwise every property proved
 *      in `ramp.spec.ts` is proved about something the app does not render;
 *   2. no shape the control offers can produce a colour outside sRGB;
 *   3. a shape whose theme the contract refuses is REFUSED rather than offered.
 *
 * The third is the reason the control exists at all. The design system ships a dark
 * end of 0.26 because it must survive the harshest brand it has never seen; a wizard
 * knows the seven actual bases, so it can ask the real validator what THOSE allow —
 * usually more. That only works if "ask" means asking rather than guessing.
 */
describe('the ramp shape', () => {
  it('reproduces REFERENCE_RAMP when nothing has been moved', () => {
    // The one that makes `ramp.spec.ts` still mean something. Every property there is
    // asserted on `REFERENCE_RAMP`, and it carries over to what the app renders only
    // if the default shape rebuilds it EXACTLY — a gap computed as (0.90 - 0.26) / 8
    // has to come out 0.08 and not 0.07999999999999999, which is why `buildRamp`
    // rounds.
    expect(buildRamp(REFERENCE_SHAPE)).toEqual(REFERENCE_RAMP);
  });

  it('keeps the rung COUNT below the 100, re-spacing to reach the new end', () => {
    for (const darkEnd of DARK_END_CHOICES) {
      const main = buildRamp({ darkEnd }).filter((rung) => rung.step >= 100);

      // THE COUNT IS NOT A CHOICE. The alias map in `vars.css` names steps by number,
      // so dropping the 300 would not restyle the scale — it would leave
      // `--fm-color-*` pointing at a rung that no longer exists. Moving the dark end
      // re-spaces nine rungs; it never removes one.
      expect(
        main.map((rung) => rung.step),
        `dark end ${darkEnd}`,
      ).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);

      // Still evenly spaced, which is the property the numbers were re-chosen for —
      // the previous curve put three mid rungs half a step apart and they read as one
      // colour repeated.
      const gaps = main
        .slice(1)
        .map((rung, i) =>
          Number(
            (
              (main[i] as { lightness: number }).lightness - rung.lightness
            ).toFixed(4),
          ),
        );

      expect(
        new Set(gaps).size,
        `dark end ${darkEnd}: gaps ${gaps.join(' ')}`,
      ).toBe(1);
      expect(main.at(-1)?.lightness).toBeCloseTo(darkEnd, 4);
    }
  });

  it('always carries both pale rungs, ordered lightest first', () => {
    // THE PALE END STOPPED BEING A CHOICE, and the test changed with it. It used to
    // assert that `paleRungs: 1` meant the 50 rather than the 25 — a real property of
    // a control that no longer exists, because nine roles point at the 50 and "no
    // pale end" is therefore impossible for every brand rather than for some.
    //
    // What is left to hold is the ORDER: the ramp reads lightest first, so the 25
    // comes before the 50 even though the 50 is the one that was added first.
    for (const darkEnd of DARK_END_CHOICES) {
      expect(
        buildRamp({ darkEnd })
          .map((rung) => rung.step)
          .slice(0, 3),
        `dark end ${darkEnd}`,
      ).toEqual([25, 50, 100]);
    }
  });

  it('keeps every offered shape inside sRGB, for every brand on the grid', () => {
    // THE ONE THAT DEFENDS THE BOUND ON `DARK_END_CHOICES`. `buildRamp` carries the
    // chroma factors over by STEP rather than recomputing them at the new lightness,
    // and each factor is the gamut ceiling at the REFERENCE lightness. That is safe
    // only because the choices go one way: moving the dark end UP raises the ceiling
    // underneath every factor. Add a DARKER option and this fails — which is the
    // point, because otherwise `generatePalette`'s clamp absorbs it silently and
    // ships a rung less saturated than its own number claims.
    const outside: string[] = [];

    for (const darkEnd of DARK_END_CHOICES) {
      const ramp = buildRamp({ darkEnd });

      for (const [label, bases] of GRID) {
        const palette = generatePalette(bases, ramp) as Record<
          string,
          Record<number, string>
        >;

        for (const family of FAMILY_NAMES) {
          for (const { step } of ramp) {
            const value = palette[family]?.[step] as string;
            if (!displayable(value)) {
              outside.push(`${darkEnd} ${label} ${family}-${step}: ${value}`);
            }
          }
        }
      }
    }

    expect(outside, outside.slice(0, 5).join('\n')).toEqual([]);
  });
});

describe('probing a shape against real bases', () => {
  it('allows the shipped shape for the shipped bases', () => {
    const verdict = probeShape(
      DECLARED,
      REFERENCE_BASES,
      buildRamp(REFERENCE_SHAPE),
    );

    // The reason is read first: a bare `allowed` failure says nothing, and the
    // validator's own message is the whole diagnosis.
    expect(verdict.reason ?? '').toBe('');
    expect(verdict.allowed).toBe(true);
  });

  it('REFUSES a shape whose theme the contract refuses, with the reason', () => {
    // The behaviour the control is built on. A dark end of 0.34 fails 120 of the 144
    // brands, so on those bases the probe must say no — and say why, because a
    // segment greyed out for no stated reason is worse than one not offered at all.
    const refused = GRID.map(
      ([label, bases]) =>
        [
          label,
          probeShape(DECLARED, bases, buildRamp({ darkEnd: 0.34 })),
        ] as const,
    ).filter(([, verdict]) => !verdict.allowed);

    expect(refused.length).toBeGreaterThan(0);
    for (const [label, verdict] of refused) {
      expect(
        verdict.reason,
        `${label} was refused with no reason`,
      ).toBeTruthy();
    }
  });

  it('answers either way and never throws', () => {
    // NOT asserted as "allowed". Whether 0.30 clears for THESE seven bases is a fact
    // about the current brand and would make this test a hostage to a retune — the
    // control is meant to discover that, not to have it pinned. What must hold is
    // that a verdict comes back at all: `generateTheme` throws on a hole, and a probe
    // that propagated it would crash the page instead of greying out one segment.
    const lighter = probeShape(
      DECLARED,
      REFERENCE_BASES,
      buildRamp({ darkEnd: 0.3 }),
    );

    expect(typeof lighter.allowed).toBe('boolean');
    expect(lighter.allowed || Boolean(lighter.reason)).toBe(true);
  });

  it('turns a shape that cannot be BUILT into an unavailable option', () => {
    // `generateTheme` throws on a hole, correctly, and the probe has to turn that into
    // an unavailable option rather than a crash on step two.
    //
    // PROVOKED DIFFERENTLY THAN IT WAS. The old provocation was `paleRungs: 0` against
    // an alias map naming the 50 — a real case until the pale end stopped being a
    // choice, at which point it could not be constructed at all. So this points a role
    // at the 1500, which exists in the DARK ramp and not in light's: a plausible
    // mistake, since the two ramps do not have the same steps.
    const repointed = new Map(DECLARED);
    repointed.set(
      '--fm-color-primary-subtle',
      'var(--fm-palette-primary-1500)',
    );

    const verdict = probeShape(
      repointed,
      REFERENCE_BASES,
      buildRamp({ darkEnd: 0.26 }),
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain('primary-1500');
  });
});
