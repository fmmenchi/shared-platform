import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCssVars } from '@fmmenchi/theme';
import { clampChroma, converter, displayable, parse } from 'culori';
import { describe, expect, it } from 'vitest';

/**
 * THE NEUTRAL RAMP — the one family that is STATED rather than derived, and therefore
 * the one nothing was checking.
 *
 * ADR-0032: no single base spans 1.00 to 0.05 and still resolves the pale end, so the
 * greys are written out. That is the right call and it has a cost the chromatic
 * families do not pay — a rung there is produced by a ramp somebody has to state, so
 * it cannot drift; a grey here is a line somebody typed.
 *
 * IT DID DRIFT. Step 30 shipped at chroma 0.014 between neighbours at 0.004 and 0.006
 * — pushed to 97.8% of what sRGB allows at its lightness, where they sit at 56% and
 * 36% — and five thousandths of a lightness from step 35, below a JND. One role used
 * it. Nothing failed, because nothing asked.
 *
 * WHAT THIS FILE ASSERTS IS THE SHAPE, NOT THE VALUES. Thirty-five numbers pinned
 * one by one would be a copy of the stylesheet in another file, failing on every
 * deliberate retune and catching nothing a reader could not see. The shape is the
 * design, and it survives a retune:
 *
 *   the number IS the lightness      step = (1 - L) x 1000, exactly
 *   both pure ends are achromatic    a tinted white is a cast across the whole page
 *   one hue throughout               nothing swings the cast toward another colour
 *   the cast never DECREASES         as the grey darkens, until the gamut clamps it
 *   the plateau is real              0.020 from L 0.56 down, not a wandering value
 *   nothing sits on the boundary     where the plateau is reachable
 *
 * WHICH OF THOSE WOULD HAVE CAUGHT STEP 30: the monotonic one, and only it. Verified
 * by putting the step back in memory and re-running — the cast falls from 0.014 to
 * 0.006 between it and step 35, which nothing else here objects to. The boundary check
 * exempts it by design, because at L 0.970 sRGB allows only 0.0143 and the plateau is
 * out of reach, so being near the ceiling up there is the design. Worth knowing which
 * assertion is load-bearing: a test suite where every check passes for a different
 * reason than you think is a suite that will let the next one through.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT: that every step has a role pointing at it.
 * Eighteen do not, and that is correct — the theme builder offers all thirty-five for
 * re-pointing any of the 84 roles, so an unreferenced step is the choice a person has
 * not made yet. A test for that would fail on the vocabulary.
 */
const here = dirname(fileURLToPath(import.meta.url));
const declared = parseCssVars(
  readFileSync(join(here, 'styles/vars.css'), 'utf8'),
);
const toOklch = converter('oklch');

/** The stated greys, palest first. */
const greys = [...declared]
  .flatMap(([name, value]) => {
    const match = /^--fm-palette-neutral-(\d+)$/.exec(name);
    if (!match) return [];
    const colour = toOklch(parse(value));
    return [
      {
        step: Number(match[1]),
        value,
        l: colour?.l ?? 0,
        c: colour?.c ?? 0,
        h: colour?.h,
      },
    ];
  })
  .sort((a, b) => a.step - b.step);

/** What sRGB allows at that lightness and hue — the boundary the cast lives under. */
const ceiling = (l: number, h: number) =>
  clampChroma({ mode: 'oklch', l, c: 0.5, h }, 'oklch').c;

/** Where the plateau begins, stated in `vars.css` and asserted below. */
const PLATEAU = { chroma: 0.02, from: 0.56, to: 0.1 };

describe('the neutral ramp', () => {
  it('names every step after its own lightness', () => {
    // The naming rule, and the reason it is worth keeping: `--fm-palette-neutral-620`
    // is L 0.38 and a reader needs nothing else. A chromatic `700` needs the ramp.
    for (const grey of greys) {
      expect(grey.l, `neutral-${grey.step}`).toBeCloseTo(
        1 - grey.step / 1000,
        3,
      );
    }

    expect(greys.length).toBeGreaterThan(30);
  });

  it('keeps both pure ends achromatic', () => {
    // A tinted white is a colour cast across the entire page, and a tinted black is
    // the same thing underneath it.
    const ends = greys.filter((g) => g.l >= 0.999 || g.l <= 0.001);

    expect(ends.map((g) => g.step)).toEqual([0, 1000]);
    for (const end of ends) {
      expect(end.c, `neutral-${end.step}`).toBe(0);
    }
  });

  it('uses ONE hue for every step that has one', () => {
    // A cast that swung hue partway down the scale would read as two different greys,
    // and the roles pick from the scale by lightness alone.
    const hues = greys.filter((g) => g.c > 0.0005).map((g) => g.h ?? 0);

    expect(new Set(hues), `hues: ${[...new Set(hues)].join(' ')}`).toEqual(
      new Set([hues[0]]),
    );
  });

  it('never lets the cast DECREASE as the grey darkens', () => {
    // THE INVARIANT STEP 30 BROKE, and the one that catches the next one. Read palest
    // first, the chroma is non-decreasing until the gamut takes it away near black:
    // 0 → 0.004 → 0.006 → 0.007 → … → 0.020, held, then clamped.
    //
    // Excluding the two pure ends, which are achromatic by decision rather than by
    // curve, and the tail below the plateau where the ceiling is the author.
    const rising = greys.filter(
      (g) => g.l < 0.999 && g.l >= PLATEAU.to && g.c > 0,
    );
    const falls: string[] = [];

    for (let i = 1; i < rising.length; i++) {
      const before = rising[i - 1] as (typeof rising)[number];
      const now = rising[i] as (typeof rising)[number];
      if (now.c < before.c - 0.0001) {
        falls.push(
          `neutral-${before.step} (C ${before.c.toFixed(4)}) → neutral-${now.step} (C ${now.c.toFixed(4)})`,
        );
      }
    }

    expect(falls, falls.join('\n')).toEqual([]);
  });

  it('holds the plateau it claims to hold', () => {
    // Stated in `vars.css`: 0.020 from L 0.56 down to L 0.10. A "roughly 0.02" that
    // was actually eighteen different numbers is what the old comment described, and
    // the comment was what people read.
    const plateau = greys.filter(
      (g) => g.l <= PLATEAU.from + 0.001 && g.l >= PLATEAU.to - 0.001,
    );

    expect(plateau.length).toBeGreaterThan(10);
    for (const grey of plateau) {
      expect(
        grey.c,
        `neutral-${grey.step} at L ${grey.l.toFixed(2)}`,
      ).toBeCloseTo(PLATEAU.chroma, 4);
    }
  });

  it('keeps every step clear of the gamut boundary, where the plateau is reachable', () => {
    // A colour ON the boundary is one a browser has to map back its own way, and two
    // engines then disagree about the grey a page is painted with.
    //
    // EXEMPT WHERE THE PLATEAU IS OUT OF REACH, which is both ends: step 950's ceiling
    // is 0.0171 and step 15's is 0.0071, so up there and down there being near the
    // ceiling is the design rather than a drift. That exemption is also why this check
    // did NOT catch step 30 — its ceiling was 0.0143, under the plateau — and the
    // monotonic check above is the one that did. Measured, not assumed.
    const tight: string[] = [];

    for (const grey of greys) {
      if (grey.c === 0) continue;
      const cap = ceiling(grey.l, grey.h ?? 0);
      const share = grey.c / cap;
      const plateauReachable = cap >= PLATEAU.chroma;

      if (plateauReachable && share > 0.9) {
        tight.push(
          `neutral-${grey.step}: C ${grey.c.toFixed(4)} is ${(share * 100).toFixed(1)}% of the ${cap.toFixed(4)} available`,
        );
      }
    }

    expect(tight, tight.join('\n')).toEqual([]);
  });

  it('resolves to a colour a browser can paint, at every step', () => {
    for (const grey of greys) {
      expect(
        displayable(grey.value),
        `neutral-${grey.step}: ${grey.value}`,
      ).toBe(true);
    }
  });
});
