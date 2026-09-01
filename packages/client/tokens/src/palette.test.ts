import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PALETTE_FAMILIES,
  parseCssVars,
  resolveCssVar,
  toTheme,
  validateTheme,
} from '@fmmenchi/theme';
import { converter, displayable, parse } from 'culori';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const declared = parseCssVars(
  readFileSync(join(here, 'styles/vars.css'), 'utf8'),
);
const toOklch = converter('oklch');
const rung = (family: string, step: number) =>
  toOklch(
    parse(
      resolveCssVar(
        declared.get(`--fm-palette-${family}-${step}`) as string,
        declared,
      ),
    ),
  );

/**
 * THE PALETTE LAYER — nine rungs under seven bases, and what makes them a scale.
 *
 * Level 2 of the token architecture (ADR-0032). The rungs are relative colour off
 * their base, and they stay that way for a reason worth stating: it is what makes a
 * rebrand SEVEN NUMBERS rather than sixty-three. Override
 * `--fm-palette-primary-base` in your own stylesheet and every rung and every role
 * above it follows, live, in the browser —
 * `@fmmenchi/ui`'s `token-overrides.test.tsx` is the test that defends it, and
 * rewriting these as static literals (tried, reverted) is what breaks it.
 *
 * WHAT CHANGED IS THE OFFSETS, WHICH ARE NOW PER FAMILY. They used to be one shared
 * curve, and that is the defect: the bases sit between 0.54 and 0.60, so a shared
 * `calc(l - 0.33)` put `-900` at 0.22 for `accent` and 0.27 for `warning`. "The 900"
 * was not a lightness, it was seven of them — and a contrast floor cleared by one
 * family said nothing about the next, which is exactly what ADR-0033 says a
 * guarantee must not do. Each family now carries the offsets that land it on the
 * SAME absolute lightness.
 *
 * AND THE STEPS ARE EVEN. Measured on the old curve, the gaps ran 0.10 0.10 0.10
 * 0.05 0.05 0.09 0.10 0.09 — rungs 400, 500 and 600 half a step apart, rendering as
 * one colour three times. Nine rungs where six were distinguishable. Every gap is
 * 0.08 now.
 *
 * THE DARK END IS 0.26, and it is as light as the contract allows. Material's 900 is
 * L 0.42 and Tailwind's 0.38; generated across 144 synthetic brands, the declared
 * pairs fail for 120 of them at 0.34 and 60 at 0.30, while 0.26 fails none. The pair
 * that gives way first is always `input × input-invalid`, the tightest floor in the
 * contract at 3:1. So the darkness is not a preference — it is what buys the promise
 * that a pair clearing its floor for one brand clears it for every brand. Material
 * and Tailwind sit lighter because they hand-tune each palette and promise nothing
 * about a brand they have not seen.
 *
 * CHROMA FACTORS ARE THE GAMUT CEILING, and here that is load-bearing rather than
 * tidy: a relative colour is clamped by the BROWSER, differently per engine, so a
 * factor over the ceiling would make the shipped colour depend on who is rendering
 * it — and `validateTheme` would be measuring a colour no user sees. Solved by
 * bisection at each lightness, over the tightest of the seven hues.
 */
const RAMP = [
  { step: 100, lightness: 0.9, chroma: 0.27 },
  { step: 200, lightness: 0.82, chroma: 0.54 },
  { step: 300, lightness: 0.74, chroma: 0.85 },
  { step: 400, lightness: 0.66, chroma: 1 },
  { step: 500, lightness: 0.58, chroma: 1 },
  { step: 600, lightness: 0.5, chroma: 1 },
  { step: 700, lightness: 0.42, chroma: 0.87 },
  { step: 800, lightness: 0.34, chroma: 0.7 },
  { step: 900, lightness: 0.26, chroma: 0.53 },
] as const;

describe('the palette layer', () => {
  it('puts every family on the SAME lightness at a given rung', () => {
    // The defect the shared offsets had. This is the assertion that keeps the
    // per-family offsets honest: retune a base without recomputing its offsets and
    // that family drifts off the scale, here.
    for (const { step, lightness } of RAMP) {
      for (const family of PALETTE_FAMILIES) {
        expect(rung(family, step)?.l, `${family}-${step}`).toBeCloseTo(
          lightness,
          2,
        );
      }
    }
  });

  it('steps evenly, so nine rungs are nine colours', () => {
    const gaps = RAMP.slice(1).map((r, i) =>
      Number(
        ((RAMP[i] as { lightness: number }).lightness - r.lightness).toFixed(4),
      ),
    );

    expect(new Set(gaps), `gaps: ${gaps.join(' ')}`).toEqual(new Set([0.08]));
  });

  it('keeps the rungs DERIVED, which is what makes a rebrand seven numbers', () => {
    // Static literals were tried here and reverted: they fix the scale and break the
    // capability. A rung must still name its base, or overriding one number stops
    // moving the family and a consumer is back to sixty-three.
    for (const family of PALETTE_FAMILIES) {
      for (const { step } of RAMP) {
        expect(
          declared.get(`--fm-palette-${family}-${step}`),
          `${family}-${step}`,
        ).toContain(`var(--fm-palette-${family}-base)`);
      }
    }
  });

  it('asks for no more chroma than sRGB has at that lightness', () => {
    // Load-bearing, not tidy: relative colour is clamped by the BROWSER, per engine.
    // Over the ceiling and the shipped colour depends on who renders it, while the
    // validator measures something else.
    const ceiling = (lightness: number, hue: number) => {
      let low = 0;
      let high = 0.45;
      for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        if (displayable(`oklch(${lightness} ${mid} ${hue})`)) low = mid;
        else high = mid;
      }
      return low;
    };

    for (const { step, lightness, chroma } of RAMP) {
      for (const family of PALETTE_FAMILIES) {
        const base = toOklch(
          parse(declared.get(`--fm-palette-${family}-base`) as string),
        );
        const room = ceiling(lightness, base?.h ?? 0) / (base?.c ?? 1);
        expect(
          chroma,
          `${family}-${step}: asks x${chroma}, ceiling x${room.toFixed(3)}`,
        ).toBeLessThanOrEqual(Math.max(room, 1));
      }
    }
  });

  it('resolves to a colour a browser can paint, at every rung', () => {
    for (const family of PALETTE_FAMILIES) {
      for (const { step } of RAMP) {
        const resolved = resolveCssVar(
          declared.get(`--fm-palette-${family}-${step}`) as string,
          declared,
        );
        expect(displayable(resolved), `${family}-${step}: ${resolved}`).toBe(
          true,
        );
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
