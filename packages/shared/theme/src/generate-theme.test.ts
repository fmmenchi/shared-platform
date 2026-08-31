import { converter, parse as parseColor } from 'culori';
import { describe, expect, it } from 'vitest';

import { generatePalette } from './palette.js';
import type { Bases, Ramp } from './palette.js';
import { generateTheme } from './generate-theme.js';
import { toPlacements } from './placements.js';
import { COLOR_ROLES, PALETTE_FAMILIES } from './tokens.types.js';

/**
 * WHAT IS WORTH ASSERTING HERE, AND WHAT IS NOT.
 *
 * The first version of this feature hardcoded the role-to-rung table and then
 * "tested" that it reproduced the shipped stylesheets. That proved the
 * transcription was faithful and nothing else — a tautology, since the table had
 * been read off those same files. It was reverted.
 *
 * There is no table now: `toPlacements` reads the map and `generateTheme`
 * substitutes. So the questions that matter are different. Does the reader
 * recognise the two forms the stylesheet uses, and refuse to guess at anything
 * else? And does the substitution take its values from the palette it was HANDED —
 * which is the whole promise, and the one thing a consumer's theme depends on.
 *
 * The fixtures below are deliberately NOT the shipped theme: a synthetic map and a
 * synthetic palette, so a passing test cannot be an accident of both sides coming
 * from one file.
 */
const toOklch = converter('oklch');
const hueOf = (css: string) => toOklch(parseColor(css))?.h ?? 0;

const RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.22 },
  { step: 500, lightness: 0.55, chromaFactor: 1 },
  { step: 900, lightness: 0.22, chromaFactor: 0.5 },
];

/** Seven bases at SEVEN DISTINCT HUES, so a value can be traced to its family. */
const BASES: Bases = {
  primary: 'oklch(55% 0.14 255)',
  secondary: 'oklch(55% 0.05 200)',
  accent: 'oklch(55% 0.07 150)',
  negative: 'oklch(55% 0.18 27)',
  success: 'oklch(55% 0.12 100)',
  warning: 'oklch(55% 0.1 60)',
  info: 'oklch(55% 0.11 300)',
};

const HUES: Record<string, number> = {
  primary: 255,
  secondary: 200,
  accent: 150,
  negative: 27,
  success: 100,
  warning: 60,
  info: 300,
};

const declarations = (rows: Record<string, string>) =>
  new Map(Object.entries(rows));

describe('toPlacements', () => {
  it('reads a plain rung reference', () => {
    const placements = toPlacements(
      declarations({
        '--fm-color-primary': 'var(--fm-palette-primary-700)',
        '--fm-color-background': 'var(--fm-palette-secondary-100)',
      }),
    );

    expect(placements.get('primary')).toEqual({
      family: 'primary',
      step: 700,
    });
    expect(placements.get('background')).toEqual({
      family: 'secondary',
      step: 100,
    });
  });

  it('reads the relative-colour form, alpha and all', () => {
    // `scrim` is the one role written this way: a rung seen through something.
    const placements = toPlacements(
      declarations({
        '--fm-color-scrim':
          'oklch(from var(--fm-palette-negative-900) l c h / 0.92)',
      }),
    );

    expect(placements.get('scrim')).toEqual({
      family: 'negative',
      step: 900,
      alpha: 0.92,
    });
  });

  it('survives the whitespace a stylesheet actually contains', () => {
    // `vars.css` wraps these across lines, so the parser sees newlines and runs of
    // spaces rather than the one-line form a test would naturally write.
    const placements = toPlacements(
      declarations({
        '--fm-color-primary': 'var(\n  --fm-palette-primary-700\n)',
      }),
    );

    expect(placements.get('primary')?.step).toBe(700);
  });

  it('SKIPS a role that states a colour outright, rather than guessing', () => {
    // A hand-written brand preset does exactly this. A reader that threw on the
    // first literal could not read one at all; one that guessed would invent a
    // rung. Left out of the map is where a caller can see it.
    const placements = toPlacements(
      declarations({
        '--fm-color-primary': 'oklch(41% 0.135 255)',
        '--fm-color-background': 'var(--fm-palette-secondary-100)',
      }),
    );

    expect(placements.has('primary')).toBe(false);
    expect(placements.has('background')).toBe(true);
  });

  it('skips a name that is not a role of this contract', () => {
    const placements = toPlacements(
      declarations({ '--fm-color-invented': 'var(--fm-palette-primary-700)' }),
    );

    expect(placements.size).toBe(0);
  });
});

describe('generateTheme', () => {
  const palette = generatePalette(BASES, RAMP);

  it('takes every value from the palette it was HANDED', () => {
    // The promise a consumer's theme rests on. Each family sits at its own hue, so
    // a role pointed at `accent-500` must come out at accent's hue and not at the
    // reference theme's — which is what a leaked hardcoded value would look like.
    const placements = toPlacements(
      declarations(
        Object.fromEntries(
          PALETTE_FAMILIES.map((family, i) => [
            `--fm-color-${['primary', 'secondary', 'accent', 'destructive', 'success', 'warning', 'info'][i] as string}`,
            `var(--fm-palette-${family}-500)`,
          ]),
        ),
      ),
    );

    const theme = generateTheme(palette, placements);

    expect(hueOf(theme.primary as string)).toBeCloseTo(
      HUES.primary as number,
      0,
    );
    expect(hueOf(theme.accent as string)).toBeCloseTo(HUES.accent as number, 0);
    expect(hueOf(theme.warning as string)).toBeCloseTo(
      HUES.warning as number,
      0,
    );
  });

  it('applies the alpha without touching the rung it came from', () => {
    const placements = toPlacements(
      declarations({
        '--fm-color-scrim':
          'oklch(from var(--fm-palette-primary-900) l c h / 0.5)',
        '--fm-color-background': 'var(--fm-palette-primary-900)',
      }),
    );

    const theme = generateTheme(palette, placements);
    const scrim = toOklch(parseColor(theme.scrim as string));
    const opaque = toOklch(parseColor(theme.background as string));

    expect(scrim?.alpha).toBe(0.5);
    expect(scrim?.l).toBeCloseTo(opaque?.l ?? 0, 6);
    expect(scrim?.h).toBeCloseTo(opaque?.h ?? 0, 6);
  });

  it('leaves a role the placements never mention ABSENT', () => {
    // Not invented, because `validateTheme` reports a missing role and cannot tell
    // a guess from a value. A caller generating part of a theme is legitimate.
    const theme = generateTheme(
      palette,
      toPlacements(
        declarations({ '--fm-color-primary': 'var(--fm-palette-primary-500)' }),
      ),
    );

    expect(Object.keys(theme)).toEqual(['primary']);
    expect(COLOR_ROLES.length).toBeGreaterThan(1);
  });

  it('THROWS when the palette has no rung a placement names, saying which', () => {
    // The failure this prevents: an undefined role resolves to its `@property`
    // initial-value — opaque black, with nothing falsy to detect — so the hole
    // survives every check that looks at what is present. The usual cause is a ramp
    // that does not reach the steps the stylesheet names.
    const placements = toPlacements(
      declarations({ '--fm-color-primary': 'var(--fm-palette-primary-1300)' }),
    );

    expect(() => generateTheme(palette, placements)).toThrow(
      /primary -> primary-1300/,
    );
  });

  it('lists EVERY missing rung, not the first', () => {
    const placements = toPlacements(
      declarations({
        '--fm-color-primary': 'var(--fm-palette-primary-1300)',
        '--fm-color-background': 'var(--fm-palette-secondary-1100)',
      }),
    );

    expect(() => generateTheme(palette, placements)).toThrow(
      /no rung for 2 role\(s\)/,
    );
  });
});
