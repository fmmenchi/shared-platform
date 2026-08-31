import { converter, parse as parseColor } from 'culori';
import { describe, expect, it } from 'vitest';

import { generateTheme } from './theme.js';
import type { Bases, Ramp } from './palette.js';
import { COLOR_ROLES, colorVar } from './tokens.types.js';

/**
 * WHAT IS WORTH ASSERTING HERE, AND WHAT IS NOT.
 *
 * The first version of this feature hardcoded the role-to-rung table and then
 * "tested" that it reproduced the shipped stylesheets. That proved the
 * transcription was faithful and nothing else — a tautology, since the table had
 * been read off those same files. It was reverted.
 *
 * There is no table now: `generateTheme` reads the aliases out of the declarations
 * it is handed and substitutes. So the question that matters is whether the
 * substitution takes its values from the BRAND it was given — which is the whole
 * promise, and the one thing a consumer's theme depends on.
 *
 * The fixtures are deliberately NOT the shipped theme: synthetic declarations and
 * synthetic bases, so a passing test cannot be an accident of both sides coming
 * from one file. The suite that asks whether the SHIPPED stylesheet still satisfies
 * the contract lives in `@fmmenchi/tokens`, beside it.
 *
 * The alias READER has its own suite in `utils/read-aliases.test.ts`. It was tested
 * from here too for a while — the same five cases in two files, which is how a
 * duplicate survives: both pass, so neither looks wrong.
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

/**
 * A stylesheet that declares EVERY role, plus whatever a test wants to say
 * differently.
 *
 * It has to be complete, because `generateTheme` now promises a whole theme or an
 * error — so a fixture naming four roles would simply report the other eighty as
 * holes. Built from `COLOR_ROLES` rather than written out, which also means a role
 * added to the contract cannot leave this suite quietly testing the old set.
 */
const declaring = (overrides: Record<string, string> = {}) =>
  new Map(
    Object.entries({
      ...Object.fromEntries(
        COLOR_ROLES.map((role) => [
          colorVar(role),
          'var(--fm-palette-primary-500)',
        ]),
      ),
      ...overrides,
    }),
  );

describe('generateTheme', () => {
  it('takes every value from the BRAND it was handed', () => {
    // The promise a consumer's theme rests on. Each family sits at its own hue, so
    // a role pointed at `accent-500` must come out at accent's hue and not at the
    // reference theme's — which is what a leaked hardcoded value would look like.
    const theme = generateTheme(
      declaring({
        '--fm-color-primary': 'var(--fm-palette-primary-500)',
        '--fm-color-accent': 'var(--fm-palette-accent-500)',
        '--fm-color-warning': 'var(--fm-palette-warning-500)',
      }),
      BASES,
      RAMP,
    );

    expect(hueOf(theme.primary)).toBeCloseTo(HUES.primary as number, 0);
    expect(hueOf(theme.accent)).toBeCloseTo(HUES.accent as number, 0);
    expect(hueOf(theme.warning)).toBeCloseTo(HUES.warning as number, 0);
  });

  it('returns a COMPLETE theme — every role the contract has', () => {
    // The contract this function now states. It used to return `Partial<Theme>`,
    // which forced a cast at every call site — including
    // `validateTheme(theme as Record<string, string>)`, since a partial theme does
    // not satisfy the validator that judges themes.
    const theme = generateTheme(declaring(), BASES, RAMP);

    expect(Object.keys(theme).length).toBe(COLOR_ROLES.length);
    for (const role of COLOR_ROLES) {
      expect(theme[role], `${role} is missing`).toBeTypeOf('string');
    }
  });

  it('takes the GREYS from the declarations, because no brand supplies them', () => {
    // THE DEFECT THE OLD SIGNATURE MADE EASY. `generateTheme(palette, aliases)` left
    // assembling the palette to the caller, and 34 of the 84 roles point at
    // `neutral` — which `generatePalette` cannot produce, since the greys are STATED
    // (ADR-0032). The wizard duly omitted that half and the function threw for every
    // possible set of bases, the shipped ones included. Taking the declarations
    // means the stated families come in with everything else.
    const theme = generateTheme(
      declaring({
        '--fm-palette-neutral-0': 'oklch(100% 0 0)',
        '--fm-palette-neutral-900': 'oklch(20% 0 0)',
        '--fm-color-background': 'var(--fm-palette-neutral-0)',
        '--fm-color-foreground': 'var(--fm-palette-neutral-900)',
      }),
      BASES,
      RAMP,
    );

    expect(toOklch(parseColor(theme.background))?.l).toBeCloseTo(1, 2);
    expect(toOklch(parseColor(theme.foreground))?.l).toBeCloseTo(0.2, 2);
    // And the brand still comes from the bases, not from the stylesheet.
    expect(hueOf(theme.primary)).toBeCloseTo(HUES.primary as number, 0);
  });

  it('lets the BRAND win over a chromatic family the stylesheet states', () => {
    // The merge order, asserted rather than assumed. A stylesheet declares all eight
    // families; the seven a brand supplies must be overwritten by the brand, or the
    // wizard would silently render the reference theme however the form was filled.
    const theme = generateTheme(
      declaring({ '--fm-palette-primary-500': 'oklch(55% 0.14 27)' }),
      BASES,
      RAMP,
    );

    // 255, from BASES — not 27, from the declaration.
    expect(hueOf(theme.primary)).toBeCloseTo(HUES.primary as number, 0);
  });

  it('CARRIES THROUGH a role that states a colour outright', () => {
    // A hand-written brand preset does exactly this, and such a role does not depend
    // on the brand at all — so keeping what it says is the honest answer. Dropping it
    // was what made the result partial.
    const theme = generateTheme(
      declaring({ '--fm-color-card': 'oklch(97% 0.01 250)' }),
      BASES,
      RAMP,
    );

    expect(toOklch(parseColor(theme.card))?.l).toBeCloseTo(0.97, 2);
  });

  it('applies the alpha without touching the rung it came from', () => {
    const theme = generateTheme(
      declaring({
        '--fm-color-scrim':
          'oklch(from var(--fm-palette-primary-900) l c h / 0.5)',
        '--fm-color-background': 'var(--fm-palette-primary-900)',
      }),
      BASES,
      RAMP,
    );

    const scrim = toOklch(parseColor(theme.scrim));
    const opaque = toOklch(parseColor(theme.background));

    expect(scrim?.alpha).toBe(0.5);
    expect(scrim?.l).toBeCloseTo(opaque?.l ?? 0, 6);
    expect(scrim?.h).toBeCloseTo(opaque?.h ?? 0, 6);
  });

  it('THROWS when the palette has no rung an alias names, saying which', () => {
    // The failure this prevents: an undefined role resolves to its `@property`
    // initial-value — opaque black, with nothing falsy to detect — so the hole
    // survives every check that looks at what is present. The usual cause is a ramp
    // that does not reach the steps the stylesheet names.
    expect(() =>
      generateTheme(
        declaring({ '--fm-color-primary': 'var(--fm-palette-primary-1300)' }),
        BASES,
        RAMP,
      ),
    ).toThrow(/primary -> primary-1300 \(no such rung\)/);
  });

  it('THROWS when the stylesheet does not declare a role at all', () => {
    // The other kind of hole, and the reason this is not `Partial<Theme>`: a caller
    // asking for a theme gets one or gets told why not.
    const incomplete = declaring();
    incomplete.delete(colorVar('primary'));

    expect(() => generateTheme(incomplete, BASES, RAMP)).toThrow(
      /primary \(not declared\)/,
    );
  });

  it('lists EVERY hole, not the first', () => {
    expect(() =>
      generateTheme(
        declaring({
          '--fm-color-primary': 'var(--fm-palette-primary-1300)',
          '--fm-color-background': 'var(--fm-palette-secondary-1100)',
        }),
        BASES,
        RAMP,
      ),
    ).toThrow(/Cannot generate 2 of \d+ role\(s\)/);
  });
});
