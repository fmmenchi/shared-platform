import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  generatePalette,
  generateTheme,
  parseTheme,
  resolveCssVar,
  validateTheme,
} from '@fmmenchi/theme';
import { converter, formatHex, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES, REFERENCE_DARK_BASES } from '../app/bases';
import { DARK_REFERENCE_RAMP } from '../app/ramp';

/**
 * THE DARK THEME THE WIZARD BUILDS IS THE ONE THE DESIGN SYSTEM SHIPS.
 *
 * The light half of this claim has been asserted for a while (`ramp.spec.ts`). The
 * dark half could not be, and the reason was not the ramp: the dark preset's seven
 * BASES were hand-picked and followed no rule — measured, neither a fraction of the
 * gamut ceiling at L 0.75 (3.16x spread) nor a fraction of the light chroma (2.02x).
 * So there was nothing to compute them from, `--scheme=dark` could only ever have
 * been a label on light-derived colours, and this file could not exist.
 *
 * They are derived now, so it can. What it holds:
 *
 *   1. the app's default dark bases ARE the shipped ones;
 *   2. the dark ramp over those bases reproduces every shipped dark rung;
 *   3. the theme that comes out is allowed by the contract.
 *
 * Read as a browser reads it — `vars.css` first, then the preset over it. Read alone
 * the preset does not resolve: it points at greys only `vars.css` declares.
 */
const require = createRequire(import.meta.url);
const vars = readFileSync(
  require.resolve('@fmmenchi/tokens/styles/vars.css'),
  'utf8',
);
const declared = parseTheme(
  vars,
  readFileSync(
    require.resolve('@fmmenchi/tokens/styles/presets/dark.css'),
    'utf8',
  ),
);

const toOklch = converter('oklch');
const families = Object.keys(
  REFERENCE_BASES,
) as (keyof typeof REFERENCE_BASES)[];

const shipped = (name: string) =>
  toOklch(parse(resolveCssVar(declared.get(name) as string, declared)));

describe('the dark theme', () => {
  it('opens on the bases the design system SHIPS', () => {
    // The app holds them as hex, because that is what `<input type="color">` takes.
    // They are computed from `REFERENCE_BASES` rather than listed, so this is really
    // asking whether the shipped preset still agrees with the derivation — the same
    // question `bases.spec.ts` asks about the light seven, and the reason neither
    // list can quietly fall behind a retune.
    const apart: string[] = [];

    for (const family of families) {
      const mine = toOklch(parse(REFERENCE_DARK_BASES[family]));
      const theirs = shipped(`--fm-palette-${family}-base`);
      const delta = Math.max(
        Math.abs((mine?.l ?? 0) - (theirs?.l ?? 0)),
        Math.abs((mine?.c ?? 0) - (theirs?.c ?? 0)),
      );
      // Loose by a thousandth: the app's copy is hex, which is 8 bits a channel.
      if (delta > 0.002) {
        apart.push(
          `${family}: app ${REFERENCE_DARK_BASES[family]} (c ${mine?.c?.toFixed(4)}) vs shipped c ${theirs?.c?.toFixed(4)}`,
        );
      }
    }

    expect(apart, apart.join('\n')).toEqual([]);
  });

  it('REPRODUCES every shipped dark rung, all seventeen', () => {
    // The claim that makes the wizard an invocation of the shipped code path rather
    // than a lookalike, now for both themes. It compares as COLOUR and not as text:
    // the stylesheet resolves to `oklch(95% …)` and the generator says `oklch(0.95 …)`.
    const generated = generatePalette(
      REFERENCE_DARK_BASES,
      DARK_REFERENCE_RAMP,
    ) as Record<string, Record<number, string>>;
    const mismatches: string[] = [];

    for (const family of families) {
      for (const { step } of DARK_REFERENCE_RAMP) {
        const mine = toOklch(parse(generated[family]?.[step] as string));
        const theirs = shipped(`--fm-palette-${family}-${step}`);
        const delta = Math.max(
          Math.abs((mine?.l ?? 0) - (theirs?.l ?? 0)),
          Math.abs((mine?.c ?? 0) - (theirs?.c ?? 0)),
        );
        if (delta > 0.0025) {
          mismatches.push(
            `${family}-${step}: ${formatHex(generated[family]?.[step] as string)} vs shipped, Δ${delta.toFixed(4)}`,
          );
        }
      }
    }

    expect(mismatches, mismatches.slice(0, 8).join('\n')).toEqual([]);
  });

  it('produces a theme the contract allows', () => {
    // `declared` carries the DARK alias map, which is the other half of why a dark
    // theme is not the light one inverted: `-subtle` points at the 1400 here and at
    // the 50 there. Passing light's map with dark's bases would generate a theme that
    // validates and looks wrong.
    const theme = generateTheme(
      declared,
      REFERENCE_DARK_BASES,
      DARK_REFERENCE_RAMP,
    );
    const violations = validateTheme(theme);

    expect(violations, violations.map((v) => v.message).join('\n')).toEqual([]);
  });

  it('is a DIFFERENT shape from the light ramp, not a mirror', () => {
    // Stated as a check because it is the thing a reader gets wrong first. Dark takes
    // thirteen strides of 0.05 below its 100 where light takes nine of 0.08, and its
    // base sits at the 500 rather than off the scale.
    const main = DARK_REFERENCE_RAMP.filter((rung) => rung.step >= 100);
    const gaps = main
      .slice(1)
      .map((rung, i) =>
        Number(
          (
            (main[i] as { lightness: number }).lightness - rung.lightness
          ).toFixed(4),
        ),
      );

    expect(new Set(gaps), `gaps: ${gaps.join(' ')}`).toEqual(new Set([0.05]));
    expect(DARK_REFERENCE_RAMP).toHaveLength(17);
    expect(
      DARK_REFERENCE_RAMP.find((rung) => rung.step === 500)?.lightness,
    ).toBeCloseTo(0.75, 4);
  });
});
