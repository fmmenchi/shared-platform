import {
  generatePalette,
  generateTheme,
  resolveCssVar,
  validateTheme,
} from '@fmmenchi/theme';
import { converter, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { REFERENCE_RAMP } from '../app/ramp';
import { DECLARED, GRID } from './grid';

/**
 * WHAT THE RAMP'S NUMBERS ARE FOR, held so they cannot drift back.
 *
 * Two properties, and both were chosen by measurement rather than taste — which
 * means both need a test, or the next person retuning a rung has no way to know what
 * they are spending.
 *
 * The 144-brand grid these are measured on lives in `grid.ts`, shared with
 * `ramp-shape.spec.ts` — a second copy would be a second definition of "harsh",
 * free to drift, and a claim proved on one would be quoted about the other.
 */
const toOklch = converter('oklch');

describe('the ramp', () => {
  it('is EVENLY spaced from 100 down, and compresses above it', () => {
    // TWO SHAPES ON PURPOSE. Below 100 an even step is what makes nine rungs nine
    // colours — the previous numbers ran 0.10 0.10 0.10 then 0.05 0.05 then 0.09 0.10
    // 0.09, so three mid rungs sat half a step apart and read as one colour repeated.
    //
    // Above 100 the gamut runs out: toward white there is less and less room, so an
    // even step would spend it on nothing. 0.08 → 0.05 → 0.025, which is the shape
    // Radix's pale end has for the same reason.
    const main = REFERENCE_RAMP.filter((rung) => rung.step >= 100);
    const gaps = main
      .slice(1)
      .map((rung, i) =>
        Number(
          (
            (main[i] as { lightness: number }).lightness - rung.lightness
          ).toFixed(4),
        ),
      );

    expect(new Set(gaps), `gaps below 100: ${gaps.join(' ')}`).toEqual(
      new Set([0.08]),
    );

    const pale = REFERENCE_RAMP.filter((rung) => rung.step < 100).map(
      (rung) => rung.lightness,
    );
    expect(pale).toEqual([0.975, 0.95]);
  });

  it('keeps the guarantee for every brand on the grid', () => {
    // ADR-0033's promise: a pair that clears its floor for one brand clears it for
    // all of them. This is the assertion that promise reduces to.
    const failures: string[] = [];

    for (const [name, bases] of GRID) {
      const violations = validateTheme(
        generateTheme(DECLARED, bases, REFERENCE_RAMP),
      );
      if (violations.length > 0) {
        failures.push(`${name}: ${violations[0]?.message}`);
      }
    }

    expect(
      failures,
      `${failures.length} of ${GRID.length} brands fail\n${failures.slice(0, 5).join('\n')}`,
    ).toEqual([]);
  });

  it('sits as light as that guarantee allows, and no lighter', () => {
    // THE PRICE, MADE VISIBLE. Material's 900 is L 0.42 and Tailwind's 0.38; ours is
    // 0.26, and the darkness is what buys the property above. Measured on this grid:
    // 0.34 fails 120 of 144, 0.30 fails 60, 0.26 fails none. There is a cliff, and
    // the pair that gives way first is always `input × input-invalid`, the tightest
    // floor in the contract at 3:1.
    //
    // So this asserts the cliff rather than the number: one step lighter must break,
    // or 0.26 is leaving contrast unspent and the comment above is wrong.
    const lighter = REFERENCE_RAMP.map((rung) => ({
      ...rung,
      lightness: Number((rung.lightness + 0.04).toFixed(4)),
    }));

    const broken = GRID.filter(
      ([, bases]) =>
        validateTheme(generateTheme(DECLARED, bases, lighter)).length > 0,
    );

    expect(
      broken.length,
      'a ramp 0.04 lighter throughout passes everywhere — then this one is darker than it needs to be',
    ).toBeGreaterThan(0);
  });

  it('REPRODUCES the shipped stylesheet, fed the shipped bases', () => {
    // The claim that was a direction for months and is now a fact. `vars.css` writes
    // its rungs as relative colour off each base, this states them absolutely, and
    // the two must land on the same colour — otherwise "ours is an invocation of the
    // same code path as a consumer's" is a story rather than a property.
    //
    // It failed before this: the stylesheet's offsets were shared while its bases sit
    // at 0.54–0.60, so five of the seven families came out somewhere else.
    const generated = generatePalette(REFERENCE_BASES, REFERENCE_RAMP);
    const mismatches: string[] = [];

    for (const family of Object.keys(REFERENCE_BASES)) {
      for (const { step } of REFERENCE_RAMP) {
        const shipped = resolveCssVar(
          DECLARED.get(`--fm-palette-${family}-${step}`) as string,
          DECLARED,
        );
        const ours = (generated as Record<string, Record<number, string>>)[
          family
        ]?.[step] as string;

        const a = toOklch(parse(shipped));
        const b = toOklch(parse(ours));
        // Compared as colour rather than as text: one side is `oklch(90% …)` from CSS
        // and the other `oklch(0.9 …)` from the generator, and a string compare would
        // fail on the notation while the colours agreed.
        const apart = Math.max(
          Math.abs((a?.l ?? 0) - (b?.l ?? 0)),
          Math.abs((a?.c ?? 0) - (b?.c ?? 0)),
        );
        if (apart > 0.002) {
          mismatches.push(`${family}-${step}: ${shipped} vs ${ours}`);
        }
      }
    }

    expect(mismatches, mismatches.slice(0, 6).join('\n')).toEqual([]);
  });

  it('reaches the rung the roles actually rely on', () => {
    // `--fm-color-primary` points at 700. It was L 0.410 under the old numbers and is
    // 0.420 under these — the role that matters most barely moved, which is why this
    // re-spacing is not a visual redesign.
    const seven = REFERENCE_RAMP.find((rung) => rung.step === 700);

    expect(seven?.lightness).toBeCloseTo(0.42, 3);
  });
});
