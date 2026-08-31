import { describe, expect, it } from 'vitest';

import { parseThemeFile } from './exchange.js';
import { generatePalette } from './palette.js';
import type { Bases, Ramp } from './palette.js';
import { toCssVars } from './theme.js';

const RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.22 },
  { step: 700, lightness: 0.41, chromaFactor: 0.96 },
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

const file = {
  name: 'acme',
  palette: generatePalette(BASES, RAMP),
  themes: { base: { primary: 'oklch(41% 0.13 255)' } },
};

describe('parseThemeFile', () => {
  it('accepts a file the package itself produced', () => {
    // The round trip a generator actually makes: JSON on disk, back to a value.
    const read = parseThemeFile(JSON.parse(JSON.stringify(file)));

    expect(read.name).toBe('acme');
    expect(read.palette.primary[700]).toBe(file.palette.primary[700]);
  });

  it('hands the generator something toCssVars can emit', () => {
    // The whole point of the format: read it, and write the stylesheet.
    const read = parseThemeFile(JSON.parse(JSON.stringify(file)));
    const css = toCssVars(read.themes['base'] ?? {}, "[data-theme='acme']");

    expect(css).toContain("[data-theme='acme'] {");
    expect(css).toContain('--fm-color-primary:');
  });

  it('says WHICH part is wrong, not that something is', () => {
    expect(() => parseThemeFile('nope')).toThrow(/expected an object/);
    expect(() => parseThemeFile({ ...file, name: '' })).toThrow(/`name`/);
    expect(() => parseThemeFile({ ...file, palette: 42 })).toThrow(/`palette`/);
    expect(() => parseThemeFile({ ...file, themes: {} })).toThrow(/empty/);
  });

  it('names the family whose rungs are malformed', () => {
    const broken = {
      ...file,
      palette: { ...file.palette, warning: { 700: 42 } },
    };

    expect(() => parseThemeFile(broken)).toThrow(/palette\.warning/);
  });

  it('names the theme whose roles are malformed', () => {
    const broken = { ...file, themes: { dark: { primary: null } } };

    expect(() => parseThemeFile(broken)).toThrow(/themes\.dark/);
  });

  it('stops at the SHAPE: a well-formed file may still be an unusable theme', () => {
    // Legibility is validateTheme's question. A file can be perfectly formed and
    // describe a theme nobody should ship — and reporting that here would put two
    // opinions about what a theme may hold in two places.
    const formed = { ...file, themes: { base: { primary: 'oklch(99% 0 0)' } } };

    expect(() => parseThemeFile(formed)).not.toThrow();
  });
});
