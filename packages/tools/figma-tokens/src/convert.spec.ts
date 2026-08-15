import { describe, it, expect } from 'vitest';
import { toFigmaColor, toFigmaNumber } from './convert.js';

const value = <T>(c: { value: T; clipped: boolean } | { error: string }) => {
  if ('error' in c) throw new Error(`expected a value, got: ${c.error}`);
  return c;
};

describe('toFigmaColor', () => {
  it('converts oklch to Figma 0–1 sRGB', () => {
    // --fm-color-primary. #004991 in sRGB.
    const { value: rgba } = value(toFigmaColor('oklch(41% 0.135 255)'));
    expect(rgba.r).toBeCloseTo(0, 2);
    expect(rgba.g).toBeCloseTo(0x49 / 255, 2);
    expect(rgba.b).toBeCloseTo(0x91 / 255, 2);
    expect(rgba.a).toBe(1);
  });

  it('reads hex, rgb() and named colours too', () => {
    for (const css of ['#ffffff', 'rgb(255 255 255)', 'white']) {
      expect(value(toFigmaColor(css)).value).toEqual({
        r: 1,
        g: 1,
        b: 1,
        a: 1,
      });
    }
  });

  it('carries alpha through', () => {
    expect(value(toFigmaColor('rgb(0 0 0 / 50%)')).value.a).toBeCloseTo(0.5, 2);
  });

  it('does not flag an in-gamut colour', () => {
    expect(value(toFigmaColor('oklch(41% 0.135 255)')).clipped).toBe(false);
  });

  it('clips an out-of-gamut colour AND says so', () => {
    // A chroma no sRGB display can reach.
    const converted = value(toFigmaColor('oklch(70% 0.4 145)'));
    expect(converted.clipped).toBe(true);
    for (const channel of [
      converted.value.r,
      converted.value.g,
      converted.value.b,
    ]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it('reports a value that is not a colour instead of guessing', () => {
    expect(toFigmaColor('0.25rem')).toEqual({ error: 'not a colour: 0.25rem' });
  });
});

describe('toFigmaNumber', () => {
  it('resolves rem against the declared root size', () => {
    expect(value(toFigmaNumber('0.25rem', 16)).value).toBe(4);
    expect(value(toFigmaNumber('0.25rem', 10)).value).toBe(2.5);
  });

  it('takes px as it stands', () => {
    expect(value(toFigmaNumber('2px', 16)).value).toBe(2);
  });

  it('evaluates a calc() ratio, which is how a leading is declared', () => {
    expect(value(toFigmaNumber('calc(1 / 0.75)', 16)).value).toBeCloseTo(
      1.3333,
      4,
    );
  });

  it('takes a unitless number, which is how a font weight is declared', () => {
    expect(value(toFigmaNumber('600', 16)).value).toBe(600);
  });

  it('reports a value it cannot resolve instead of coercing it to NaN', () => {
    expect(toFigmaNumber('1.5em', 16)).toEqual({
      error: 'not a length or number: 1.5em',
    });
    expect(toFigmaNumber('var(--fm-font-sans)', 16)).toEqual({
      error: 'not a length or number: var(--fm-font-sans)',
    });
  });
});
