import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PALETTE_FAMILIES,
  generatePalette,
  parseCssVars,
  resolveCssVar,
  toTheme,
  validateTheme,
  type Bases,
  type Ramp,
} from '@fmmenchi/theme';
import { clampChroma, converter, displayable, parse } from 'culori';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const declared = parseCssVars(
  readFileSync(join(here, 'styles/vars.css'), 'utf8'),
);
const toOklch = converter('oklch');

/**
 * THE PALETTE LAYER — eleven rungs under seven bases, and what makes them a scale.
 *
 * Level 2 of the token architecture (ADR-0032). The rungs are relative colour off
 * their base and they stay that way for a reason worth stating: it is what makes a
 * rebrand SEVEN NUMBERS rather than seventy-seven. Override
 * `--fm-palette-primary-base` in your own stylesheet and every rung and every role
 * above it follows, live, in the browser — `@fmmenchi/ui`'s
 * `token-overrides.test.tsx` is the test that defends it, and rewriting these as
 * static literals (tried, reverted) is what breaks it.
 *
 * THE OFFSETS AND THE CHROMA FACTORS ARE BOTH PER FAMILY, which is the opposite of
 * how this layer started. One shared curve was the defect: the bases sit between 0.54
 * and 0.60, so a shared `calc(l - 0.33)` put step 900 at 0.22 for `accent` and 0.27
 * for `warning`. "The 900" was not a lightness, it was seven of them — and a contrast
 * floor cleared by one family said nothing about the next, which is what ADR-0033 says
 * a guarantee must not do.
 *
 * AND THE NUMBERS ARE NOT HAND-WRITTEN. Each is the ratio `generatePalette` actually
 * produced, read back out: that function clamps into sRGB while holding lightness, so
 * a rung is not `base.c × factor` but whatever survived, and the ratio of the result
 * resolves to precisely the same colour with nothing left for the browser to clamp.
 * The first test below is the one that keeps it that way.
 */
const RAMP: Ramp = [
  { step: 25, lightness: 0.975, chromaFactor: 1 },
  { step: 50, lightness: 0.95, chromaFactor: 1 },
  { step: 100, lightness: 0.9, chromaFactor: 0.27 },
  { step: 200, lightness: 0.82, chromaFactor: 0.54 },
  { step: 300, lightness: 0.74, chromaFactor: 0.85 },
  { step: 400, lightness: 0.66, chromaFactor: 1 },
  { step: 500, lightness: 0.58, chromaFactor: 1 },
  { step: 600, lightness: 0.5, chromaFactor: 1 },
  { step: 700, lightness: 0.42, chromaFactor: 0.87 },
  { step: 800, lightness: 0.34, chromaFactor: 0.7 },
  { step: 900, lightness: 0.26, chromaFactor: 0.53 },
];

const bases = Object.fromEntries(
  PALETTE_FAMILIES.map((family) => [
    family,
    declared.get(`--fm-palette-${family}-base`) as string,
  ]),
) as Bases;

const resolved = (family: string, step: number) =>
  toOklch(
    parse(
      resolveCssVar(
        declared.get(`--fm-palette-${family}-${step}`) as string,
        declared,
      ),
    ),
  );

describe('the palette layer', () => {
  it('resolves to exactly what generatePalette produces', () => {
    // THE ONE THAT KEEPS THE DERIVATION HONEST. A rung edited by hand, a base retuned
    // without recomputing its offsets, or a ramp changed in one place and not the
    // other, all land here. Compared as colour rather than as text: the stylesheet
    // says `oklch(90% …)` after resolution and the generator says `oklch(0.9 …)`.
    const palette = generatePalette(bases, RAMP);
    const apart: string[] = [];

    for (const family of PALETTE_FAMILIES) {
      for (const { step } of RAMP) {
        const mine = toOklch(
          parse((palette[family] as Record<number, string>)[step] as string),
        );
        const theirs = resolved(family, step);
        const delta = Math.max(
          Math.abs((mine?.l ?? 0) - (theirs?.l ?? 0)),
          Math.abs((mine?.c ?? 0) - (theirs?.c ?? 0)),
        );
        if (delta > 0.0015) {
          apart.push(`${family}-${step}: Δ${delta.toFixed(4)}`);
        }
      }
    }

    expect(apart, apart.slice(0, 8).join('\n')).toEqual([]);
  });

  it('puts every family on the SAME lightness at a given rung', () => {
    for (const { step, lightness } of RAMP) {
      for (const family of PALETTE_FAMILIES) {
        expect(resolved(family, step)?.l, `${family}-${step}`).toBeCloseTo(
          lightness,
          2,
        );
      }
    }
  });

  it('steps evenly from 100 down, and compresses above it', () => {
    // Two shapes on purpose. Below 100 an even step is what makes nine rungs nine
    // colours. Above it the gamut runs out — there is less and less room toward white
    // — so an even step would spend it on nothing, and the two pale rungs close in
    // the way Radix's do.
    const scale = RAMP.map((r) => r.lightness);
    const main = scale.slice(2);
    const gaps = main
      .slice(1)
      .map((l, i) => Number(((main[i] as number) - l).toFixed(4)));

    expect(new Set(gaps), `gaps: ${gaps.join(' ')}`).toEqual(new Set([0.08]));
    expect(scale[0]).toBeCloseTo(0.975, 4);
    expect(scale[1]).toBeCloseTo(0.95, 4);
  });

  it('keeps the pale end a TINT rather than a grey', () => {
    // The reason this file refused a step 50 for so long, and the reason it can have
    // one now: with a shared chroma coefficient the ceiling at 0.975 is x0.07 and
    // everything comes out grey. Per family it is a real tint — so this asserts each
    // pale rung sits at its own hue's ceiling rather than at the shared floor.
    for (const step of [25, 50]) {
      for (const family of PALETTE_FAMILIES) {
        const base = toOklch(parse(bases[family]));
        const ceiling = clampChroma(
          {
            mode: 'oklch',
            l: (RAMP.find((r) => r.step === step) as { lightness: number })
              .lightness,
            c: 0.5,
            h: base?.h ?? 0,
          },
          'oklch',
        ).c;

        // At its ceiling, within the rounding the emitted factor carries.
        expect(resolved(family, step)?.c, `${family}-${step}`).toBeCloseTo(
          Math.min(ceiling, base?.c ?? 0),
          3,
        );
      }
    }
  });

  it('keeps the rungs DERIVED, which is what makes a rebrand seven numbers', () => {
    for (const family of PALETTE_FAMILIES) {
      for (const { step } of RAMP) {
        expect(
          declared.get(`--fm-palette-${family}-${step}`),
          `${family}-${step}`,
        ).toContain(`var(--fm-palette-${family}-base)`);
      }
    }
  });

  it('resolves to a colour a browser can paint, at every rung', () => {
    for (const family of PALETTE_FAMILIES) {
      for (const { step } of RAMP) {
        const value = resolveCssVar(
          declared.get(`--fm-palette-${family}-${step}`) as string,
          declared,
        );
        expect(displayable(value), `${family}-${step}: ${value}`).toBe(true);
      }
    }
  });

  it('still satisfies the whole contract', () => {
    const violations = validateTheme(
      toTheme(declared) as Record<string, string>,
    );

    expect(violations, violations.map((v) => v.message).join('\n')).toEqual([]);
  });
});
