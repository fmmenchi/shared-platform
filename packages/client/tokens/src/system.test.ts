import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { describeSystem, type ThemeSource } from './system.js';

/**
 * The derived table has to describe THE SHIPPED STYLESHEETS, not a table someone
 * hoped for — so every assertion here is against `vars.css` and
 * `presets/dark.css` as they are, and a retune that moves a rung fails this file
 * rather than passing quietly.
 */

const styles = join(dirname(fileURLToPath(import.meta.url)), 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const SOURCES: readonly ThemeSource[] = [
  {
    name: 'base',
    selector: ':root',
    colorScheme: 'light',
    inks: [0, 760],
    css: read('vars.css'),
  },
  {
    name: 'dark',
    selector: "[data-theme='dark']",
    colorScheme: 'dark',
    inks: [50, 760],
    css: read('presets/dark.css'),
  },
];

const system = describeSystem(SOURCES);
const base = system.themes.find((t) => t.name === 'base');
const dark = system.themes.find((t) => t.name === 'dark');

describe('describeSystem', () => {
  it('finds the seven palette families, as the keys of each theme ramps', () => {
    expect(Object.keys(base?.ramps ?? {}).sort()).toEqual([
      'accent',
      'info',
      'negative',
      'primary',
      'secondary',
      'success',
      'warning',
    ]);
    expect(Object.keys(dark?.ramps ?? {}).sort()).toEqual([
      'accent',
      'info',
      'negative',
      'primary',
      'secondary',
      'success',
      'warning',
    ]);
  });

  it('reads each theme with its own ramp length', () => {
    expect(base?.ramps.primary).toHaveLength(9);
    expect(dark?.ramps.primary).toHaveLength(13);
  });

  it('orders rungs lightest to darkest', () => {
    for (const theme of system.themes) {
      for (const ramp of Object.values(theme.ramps)) {
        const lightnesses = ramp.map((r) => r.lightness);
        expect(lightnesses).toEqual([...lightnesses].sort((a, b) => b - a));
      }
    }
  });

  it('names the rungs the palette variables name', () => {
    expect(base?.ramps.primary.map((r) => r.step)).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900,
    ]);
    expect(dark?.ramps.primary.map((r) => r.step)).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
    ]);
  });

  it('recovers ABSOLUTE lightnesses, not the offsets that are written', () => {
    // vars.css declares `calc(l - 0.14)` off a base at 55%; the table says 0.41.
    expect(
      base?.ramps.primary.find((r) => r.step === 700)?.lightness,
    ).toBeCloseTo(0.41, 3);
    // dark's own base sits at 75%, so its 700 is a different colour entirely.
    expect(
      dark?.ramps.primary.find((r) => r.step === 700)?.lightness,
    ).toBeCloseTo(0.65, 3);
  });

  it('recovers the chroma curve as factors of the base', () => {
    expect(
      base?.ramps.primary.find((r) => r.step === 500)?.chromaFactor,
    ).toBeCloseTo(1, 3); // 500 IS the base
    expect(
      base?.ramps.primary.find((r) => r.step === 100)?.chromaFactor,
    ).toBeCloseTo(0.22, 2);
  });

  /**
   * The families do NOT share one ramp today, which is why `ramps` is keyed by
   * family rather than being a single list. The offsets are identical; the bases
   * are not, sitting at L 0.54 to 0.60, so the absolute lightnesses differ by up
   * to 0.06 at every rung. Under the absolute anchoring ADR-0033 settles these
   * converge — and this assertion is what will notice when they do.
   */
  it('shows families diverging in lightness but agreeing in shape', () => {
    const warning = base?.ramps.warning.find((r) => r.step === 700);
    const accent = base?.ramps.accent.find((r) => r.step === 700);
    expect(warning?.lightness).toBeCloseTo(0.46, 3);
    expect(accent?.lightness).toBeCloseTo(0.4, 3);

    // Same shape: every family has the same steps in the same order.
    const steps = (f: 'warning' | 'accent' | 'primary') =>
      base?.ramps[f].map((r) => r.step);
    expect(steps('warning')).toEqual(steps('primary'));
    expect(steps('accent')).toEqual(steps('primary'));
  });
});

describe('the neutral scale', () => {
  it('is described as a base and a ramp, like a family', () => {
    expect(system.neutral.base.hue).toBe(256);
    expect(system.neutral.base.chroma).toBeCloseTo(0.02, 4);
    expect(system.neutral.ramp).toHaveLength(36);
  });

  it('gives the achromatic endpoints a factor of zero', () => {
    const white = system.neutral.ramp.find((r) => r.step === 0);
    const black = system.neutral.ramp.find((r) => r.step === 1000);
    expect(white?.lightness).toBe(1);
    expect(white?.chromaFactor).toBe(0);
    expect(black?.lightness).toBe(0);
    expect(black?.chromaFactor).toBe(0);
  });

  /**
   * The curve rises toward the dark end and then plateaus — EXCEPT at one rung.
   *
   * `neutral-30` ships as `oklch(97% 0.014 256)` where its neighbours at L 98.5%
   * and 96.5% are 0.004 and 0.006: a factor of 0.7 between 0.2 and 0.3, and the
   * only rung that breaks monotonicity. Asserted as a known exception rather
   * than fixed, because a value in `vars.css` is a design decision; the point is
   * that it can no longer change, or be joined by another, unnoticed. No
   * contrast gate can see it — chroma that small barely moves relative
   * luminance.
   */
  it('rises monotonically toward the dark end, but for one known rung', () => {
    const chromatic = system.neutral.ramp.filter(
      (r) => r.lightness > 0 && r.lightness < 1,
    );
    const breaks = chromatic
      .filter(
        (rung, i) =>
          i > 0 && rung.chromaFactor < chromatic[i - 1]!.chromaFactor,
      )
      .map((r) => r.step);

    expect(breaks).toEqual([35]);
    expect(chromatic.find((r) => r.step === 30)?.chromaFactor).toBeCloseTo(
      0.7,
      2,
    );
  });
});
