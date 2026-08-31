import { converter, displayable, parse as parseColor } from 'culori';
import { describe, expect, it } from 'vitest';

import { generatePalette } from './palette.js';
import type { Bases, Ramp } from './palette.js';
import { PALETTE_FAMILIES } from './tokens.types.js';

const toOklch = converter('oklch');
const oklch = (css: string) => toOklch(parseColor(css));

/** Three rungs are enough to state every property; nine only repeat them. */
const RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.22 },
  { step: 500, lightness: 0.55, chromaFactor: 1 },
  { step: 900, lightness: 0.22, chromaFactor: 0.5 },
];

const BASES: Bases = {
  primary: 'oklch(55% 0.14 255)',
  secondary: 'oklch(55% 0.05 256)',
  accent: 'oklch(55% 0.07 195)',
  negative: 'oklch(55% 0.18 27)',
  success: 'oklch(55% 0.12 150)',
  warning: 'oklch(55% 0.1 78)',
  info: 'oklch(55% 0.11 245)',
};

describe('generatePalette', () => {
  it('places every family on the ramp, keyed for lookup', () => {
    const palette = generatePalette(BASES, RAMP);

    expect(Object.keys(palette).sort()).toEqual([...PALETTE_FAMILIES].sort());
    // The shape a caller reads: palette.primary[700].
    expect(
      Object.keys(palette.primary)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([100, 500, 900]);
  });

  it('takes the LIGHTNESS from the rung, not from the base', () => {
    // Every base above sits at 55%, and the rungs still land where they say.
    const palette = generatePalette(BASES, RAMP);

    expect(oklch(palette.primary[100] as string)?.l).toBeCloseTo(0.9, 4);
    expect(oklch(palette.primary[900] as string)?.l).toBeCloseTo(0.22, 4);
  });

  it('takes the HUE from the base, so a family keeps its colour', () => {
    const palette = generatePalette(BASES, RAMP);

    expect(oklch(palette.primary[500] as string)?.h).toBeCloseTo(255, 1);
    expect(oklch(palette.negative[500] as string)?.h).toBeCloseTo(27, 1);
    expect(oklch(palette.accent[500] as string)?.h).toBeCloseTo(195, 1);
  });

  it('scales chroma by the factor, so a muted base gets a muted ramp', () => {
    const palette = generatePalette(BASES, RAMP);

    // secondary's base is 0.05, primary's 0.14: the same rung, proportionally.
    const primary = oklch(palette.primary[900] as string)?.c ?? 0;
    const secondary = oklch(palette.secondary[900] as string)?.c ?? 0;

    expect(secondary).toBeLessThan(primary);
    expect(secondary / primary).toBeCloseTo(0.05 / 0.14, 1);
  });

  it('CLAMPS into sRGB rather than emitting a colour no browser agrees on', () => {
    // 0.4 chroma at that lightness is far outside sRGB; unclamped it would render
    // differently in every browser and falsify every contrast measured on it.
    const vivid: Bases = { ...BASES, primary: 'oklch(55% 0.4 145)' };
    const palette = generatePalette(vivid, RAMP);

    for (const step of [100, 500, 900]) {
      const value = palette.primary[step] as string;
      expect(displayable(value), `${step}: ${value}`).toBe(true);
    }
    // Clamped, not zeroed: what fits is kept.
    expect(oklch(palette.primary[500] as string)?.c).toBeGreaterThan(0.1);
  });

  it('holds lightness while chroma gives way', () => {
    // A rung that moved in lightness would leave the ramp it belongs to.
    const vivid: Bases = { ...BASES, primary: 'oklch(55% 0.4 145)' };
    const palette = generatePalette(vivid, RAMP);

    expect(oklch(palette.primary[500] as string)?.l).toBeCloseTo(0.55, 4);
  });

  it('gives an achromatic rung a factor of zero, whatever the base', () => {
    const palette = generatePalette(BASES, [
      { step: 0, lightness: 1, chromaFactor: 0 },
    ]);

    expect(oklch(palette.primary[0] as string)?.c).toBe(0);
  });

  it('accepts a hueless grey as a base', () => {
    const grey: Bases = { ...BASES, secondary: 'oklch(55% 0 0)' };
    const palette = generatePalette(grey, RAMP);

    expect(oklch(palette.secondary[500] as string)?.c).toBe(0);
  });

  it('THROWS on a base that is not a colour', () => {
    // A family of NaN would look generated and paint nothing — the failure a
    // caller cannot see.
    expect(() =>
      generatePalette({ ...BASES, primary: 'not-a-colour' }, RAMP),
    ).toThrow(/base for "primary" is not a colour/);
  });
});
