import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  generatePalette,
  generateTheme,
  parseTheme,
  resolveCssVar,
  validateTheme,
} from '@fmmenchi/theme';
import { converter, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { WIZARD_RAMP } from '../app/ramp';

/**
 * WHAT THE RAMP'S NUMBERS ARE FOR, held so they cannot drift back.
 *
 * Two properties, and both were chosen by measurement rather than taste — which
 * means both need a test, or the next person retuning a rung has no way to know what
 * they are spending.
 *
 * The grid below is 144 brands: 24 hues × 3 chroma levels × 2 lightnesses, with
 * EVERY family given the same base. That last part is what makes it harsh — no
 * family can borrow contrast from a neighbour happening to be different — and it is
 * the case a real brand never quite reaches.
 */
const require = createRequire(import.meta.url);
const declared = parseTheme(
  readFileSync(require.resolve('@fmmenchi/tokens/styles/vars.css'), 'utf8'),
);

const toOklch = converter('oklch');
const families = Object.keys(REFERENCE_BASES);
const brandsAt = (css: string) =>
  Object.fromEntries(families.map((f) => [f, css])) as typeof REFERENCE_BASES;

const GRID = (() => {
  const brands: Array<readonly [string, typeof REFERENCE_BASES]> = [];
  for (let hue = 0; hue < 360; hue += 15) {
    for (const chroma of [0.05, 0.15, 0.3]) {
      for (const lightness of [0.35, 0.65]) {
        brands.push([
          `oklch(${lightness} ${chroma} ${hue})`,
          brandsAt(`oklch(${lightness} ${chroma} ${hue})`),
        ]);
      }
    }
  }
  return brands;
})();

describe('the ramp', () => {
  it('is EVENLY spaced', () => {
    // The defect this pins: the previous numbers ran 0.10 0.10 0.10 then 0.05 0.05
    // then 0.09 0.10 0.09, so three mid rungs sat half a step apart and read as one
    // colour repeated. A ramp whose steps are not the same size is a ramp whose
    // middle is wasted.
    const gaps = WIZARD_RAMP.slice(1).map((rung, i) =>
      Number(
        (
          (WIZARD_RAMP[i] as { lightness: number }).lightness - rung.lightness
        ).toFixed(4),
      ),
    );

    expect(new Set(gaps), `gaps: ${gaps.join(' ')}`).toEqual(new Set([0.08]));
  });

  it('keeps the guarantee for every brand on the grid', () => {
    // ADR-0033's promise: a pair that clears its floor for one brand clears it for
    // all of them. This is the assertion that promise reduces to.
    const failures: string[] = [];

    for (const [name, bases] of GRID) {
      const violations = validateTheme(
        generateTheme(declared, bases, WIZARD_RAMP),
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
    const lighter = WIZARD_RAMP.map((rung) => ({
      ...rung,
      lightness: Number((rung.lightness + 0.04).toFixed(4)),
    }));

    const broken = GRID.filter(
      ([, bases]) =>
        validateTheme(generateTheme(declared, bases, lighter)).length > 0,
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
    const generated = generatePalette(REFERENCE_BASES, WIZARD_RAMP);
    const mismatches: string[] = [];

    for (const family of Object.keys(REFERENCE_BASES)) {
      for (const { step } of WIZARD_RAMP) {
        const shipped = resolveCssVar(
          declared.get(`--fm-palette-${family}-${step}`) as string,
          declared,
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
    const seven = WIZARD_RAMP.find((rung) => rung.step === 700);

    expect(seven?.lightness).toBeCloseTo(0.42, 3);
  });
});
