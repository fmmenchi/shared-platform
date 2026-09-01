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
import { converter, displayable, parse } from 'culori';
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
  { step: 25, lightness: 0.975, chromaFactor: 0.066 },
  { step: 50, lightness: 0.95, chromaFactor: 0.135 },
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

  it('keeps the pale end COMPARABLE across families, not maximally tinted', () => {
    // THE ONE THAT COST A SHIPPED DAY TO GET RIGHT. The pale rungs went out with a
    // per-family chroma ceiling — as tinted as each hue can be at that lightness —
    // on the argument that a shared factor would have to be the tightest hue's and
    // everything would come out grey.
    //
    // The cost of the other side is bigger and it is visible. sRGB does not hand out
    // pale chroma evenly: at L 0.95 green's ceiling is 0.083 and blue's is 0.024. So
    // across the four families an Alert paints side by side the spread went from
    // 1.85x at the 100 to 3.35x at the 50, and rendered, the green and the orange
    // shouted while the blue and the red whispered. A rung a ROLE points at — and
    // `-subtle` now points here — has to be comparable across families first.
    //
    // So this asserts the SPREAD rather than the ceiling: the pale rungs must be no
    // less even than the 100 they sit above.
    const spreadAt = (step: number) => {
      const status = ['negative', 'success', 'warning', 'info'] as const;
      const chromas = status.map((family) => resolved(family, step)?.c ?? 0);
      return Math.max(...chromas) / Math.min(...chromas);
    };

    const reference = spreadAt(100);
    for (const step of [25, 50]) {
      expect(
        spreadAt(step),
        `step ${step} spread ${spreadAt(step).toFixed(2)}x vs the 100's ${reference.toFixed(2)}x`,
      ).toBeLessThanOrEqual(reference + 0.05);
    }
  });

  it('keeps every STATUS family reading as itself at the 50, not as the grey', () => {
    // The other half of the pale end's job, and the reason the shared factor is the
    // CEILING rather than some safe number below it. A status wash that reads neutral
    // is a defect with a real consequence: an error Alert whose fill looks like a
    // muted panel has lost the only thing its colour was carrying.
    //
    // `neutral-50` is STATED at the same lightness as the chromatic 50, so it is the
    // honest thing to compare against rather than "is the chroma above zero".
    //
    // ASSERTED ON THE STATUS FAMILIES ONLY, and the exclusions are a measured fact
    // about the bases rather than a convenience. Against neutral-50's chroma the
    // ratios are: negative 3.5x, primary 2.7x, success 2.3x, info 2.1x, warning 1.9x
    // — then accent 1.4x and secondary 1.0x. `secondary` is a deliberately muted
    // grey-blue (base chroma 0.052) and `accent` nearly so, and a fixed fraction of a
    // nearly-grey base is a grey. So `secondary-50` IS `neutral-50` to the eye, which
    // means `secondary-subtle` and `neutral-subtle` now render alike. That is a
    // consequence worth knowing and not worth forcing: raising the factor to separate
    // them would push `negative-50` out of sRGB, and giving secondary its own factor
    // is the per-family policy this rung was just moved off.
    const grey = toOklch(
      parse(declared.get('--fm-palette-neutral-50') as string),
    );

    for (const family of ['negative', 'success', 'warning', 'info'] as const) {
      expect(
        resolved(family, 50)?.c ?? 0,
        `${family}-50 chroma vs neutral-50's ${grey?.c?.toFixed(4)}`,
      ).toBeGreaterThan((grey?.c ?? 0) * 1.5);
    }
  });

  it('points the chromatic -subtle roles at the 50, like the neutral one', () => {
    // WHY THE PALE END EXISTS AT ALL, as a check rather than a claim.
    // `--fm-color-neutral-subtle` had pointed at `neutral-50` all along, while the
    // eight chromatic families pointed at their 100 — the same role, a whole 0.05
    // darker, for no reason but a rung the chromatic ramp did not have. A Badge soft
    // neutral and a Badge soft primary sit next to each other in a UI.
    //
    // The direction is not decided by which of ours moved first, though. Off Radix's
    // published light blue, steps 3–5 are its component BACKGROUNDS at lightness
    // 0.96, 0.94, 0.91, and step 6 — its first border — is 0.86. The old 100 at 0.90
    // fell between their last fill and their first border; the 50 at 0.95 is inside
    // the range they fill components with.
    const subtle = [...declared]
      .filter(([name]) => /^--fm-color-[a-z]+-subtle$/.test(name))
      .map(([name, value]) => `${name}: ${value}`);

    expect(subtle.length).toBeGreaterThan(8);
    expect(
      subtle.filter((row) => !row.includes('-50)')),
      'every -subtle role must point at a 50',
    ).toEqual([]);
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
