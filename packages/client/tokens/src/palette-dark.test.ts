import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PALETTE_FAMILIES,
  parseTheme,
  resolveCssVar,
  toTheme,
  validateTheme,
} from '@fmmenchi/theme';
import { converter, displayable, parse } from 'culori';
import { describe, expect, it } from 'vitest';

/**
 * THE DARK PALETTE LAYER — a second scale under the same contract, not a mirror of
 * the light one.
 *
 * `presets/dark.css` restates the bases (all at lightness 0.75, where light's sit at
 * 0.54–0.60) and restates every rung, because a custom property resolves WHERE IT IS
 * DECLARED: a `[data-theme]` block overriding only the bases would be inert, the
 * rungs having already settled at `:root` against light's. So dark has a scale of its
 * own, and it needs checks of its own — `palette.test.ts` reads `vars.css` alone and
 * would notice none of this.
 *
 * ITS OWN FILE for the same reason. Kept as a second `describe` in `palette.test.ts`
 * it would share that file's `declared`, which is the light contract, and the first
 * copy-paste of a helper would quietly measure the wrong theme.
 *
 * READ AS A BROWSER READS IT: `vars.css` first, then the preset over it. Read alone
 * the preset does not resolve at all — it points at greys only `vars.css` declares,
 * and `toTheme` refuses it by design rather than returning a theme with a hole.
 *
 * `parseTheme` AND NOT `parseCssVars`, which is the API distinction and not a taste:
 * `parseCssVars` reads ONE stylesheet and throws on a duplicate declaration, because
 * two values for one token in one file means the later silently wins. `parseTheme`
 * takes several sources and merges them in CASCADE order, a later declaration
 * winning — which is what a theme preset IS. Concatenating the two files and handing
 * them to `parseCssVars` throws on `--fm-palette-primary-base`, correctly, since the
 * preset restates every base.
 */
const here = dirname(fileURLToPath(import.meta.url));
const declared = parseTheme(
  readFileSync(join(here, 'styles/vars.css'), 'utf8'),
  readFileSync(join(here, 'styles/presets/dark.css'), 'utf8'),
);

const toOklch = converter('oklch');

/**
 * Seventeen rungs. Thirteen below the 100 at an even 0.05 — half light's 0.08, which
 * is not an accident: dark's bases sit at 0.75 and the scale has to cover ground in
 * both directions from there, so it takes more rungs and each is a smaller step.
 */
const STEPS = [
  25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
  1400, 1500,
];

const rung = (family: string, step: number) =>
  resolveCssVar(
    declared.get(`--fm-palette-${family}-${step}`) as string,
    declared,
  );

const at = (family: string, step: number) => toOklch(parse(rung(family, step)));

const role = (name: string) =>
  toOklch(
    parse(
      resolveCssVar(declared.get(`--fm-color-${name}`) as string, declared),
    ),
  );

describe('the dark palette layer', () => {
  it('runs from 0.95 down to 0.25 in even strides below the 100', () => {
    const main = STEPS.filter((step) => step >= 100);
    const lightnesses = main.map((step) => at('primary', step)?.l ?? 0);
    const gaps = lightnesses
      .slice(1)
      .map((l, i) => Number(((lightnesses[i] as number) - l).toFixed(3)));

    expect(new Set(gaps), `gaps: ${gaps.join(' ')}`).toEqual(new Set([0.05]));
    expect(lightnesses[0]).toBeCloseTo(0.95, 2);
    expect(lightnesses.at(-1)).toBeCloseTo(0.25, 2);
  });

  it('puts every family on the SAME lightness at a given rung', () => {
    for (const step of STEPS) {
      const first = at('primary', step)?.l ?? 0;
      for (const family of PALETTE_FAMILIES) {
        expect(at(family, step)?.l, `${family}-${step}`).toBeCloseTo(first, 2);
      }
    }
  });

  it('resolves to a colour a browser can paint, at every rung', () => {
    // THE ONE THE DARK END NEEDED. The gamut narrows toward black as well as toward
    // white, so extending the scale to 0.25 is not free — `accent` is the tightest,
    // with a ceiling of 0.0426 there against a wanted 0.0367. And in a stylesheet the
    // clamp is the BROWSER's and differs per engine, so an out-of-gamut relative
    // colour ships differently to different people while the validator measures
    // something else.
    for (const family of PALETTE_FAMILIES) {
      for (const step of STEPS) {
        const value = rung(family, step);
        expect(displayable(value), `dark ${family}-${step}: ${value}`).toBe(
          true,
        );
      }
    }
  });

  it('keeps every rung DERIVED from its base', () => {
    for (const family of PALETTE_FAMILIES) {
      for (const step of STEPS) {
        expect(
          declared.get(`--fm-palette-${family}-${step}`),
          `dark ${family}-${step}`,
        ).toContain(`var(--fm-palette-${family}-base)`);
      }
    }
  });

  it('points -subtle at the rung matching dark’s OWN neutral-subtle', () => {
    // THE REASON THE 1400 EXISTS, and it is the same defect the 50 fixed in light —
    // smaller, and in the other direction. The scale used to stop at the 1300
    // (L 0.35) while `neutral-subtle` points at `neutral-690` at L 0.31, so the same
    // role sat 0.04 apart across families and a Badge soft neutral read visibly
    // darker than a Badge soft primary beside it.
    const neutral = role('neutral-subtle')?.l ?? 0;

    for (const family of PALETTE_FAMILIES) {
      // `negative` is the family; `destructive` and `error` are the roles that point
      // at it. Either name resolves to the same rung, so one is enough.
      const name = family === 'negative' ? 'destructive' : family;
      if (declared.get(`--fm-color-${name}-subtle`) === undefined) continue;

      const subtle = role(`${name}-subtle`)?.l ?? 0;
      expect(
        Math.abs(subtle - neutral),
        `dark ${name}-subtle L ${subtle.toFixed(3)} vs neutral-subtle's ${neutral.toFixed(3)}`,
      ).toBeLessThanOrEqual(0.015);
    }
  });

  it('reaches BELOW the surfaces a chromatic wash would have to tint', () => {
    // WHAT THE DARK END BOUGHT, as a property rather than a story. The scale used to
    // stop at 0.35 while the dark theme's own surfaces are darker — background 0.21,
    // card 0.26, muted 0.31 — so no chromatic rung could tint one. Radix's dark scale
    // by contrast begins AT its page and spends five of twelve steps below 0.40.
    //
    // The 1500 is headroom: no role points at it, and this is what makes it headroom
    // worth shipping rather than a rung nobody can use.
    const darkest = at('primary', 1500)?.l ?? 1;

    expect(darkest, 'the darkest rung must sit under `card`').toBeLessThan(
      role('card')?.l ?? 0,
    );
    expect(darkest, 'and under `muted`').toBeLessThan(role('muted')?.l ?? 0);
  });

  it('still satisfies the whole contract', () => {
    const violations = validateTheme(
      toTheme(declared) as Record<string, string>,
    );

    expect(violations, violations.map((v) => v.message).join('\n')).toEqual([]);
  });
});
