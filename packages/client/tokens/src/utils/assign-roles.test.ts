import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, differenceEuclidean, parse as parseColor } from 'culori';
import { describe, expect, it } from 'vitest';

import { assignRoles } from './assign-roles.js';
import type { ColorScheme } from './assign-roles.js';
import { parseCssVars, resolveCssVar } from './parse-css.js';
import { COLOR_ROLES, PALETTE_FAMILIES } from '../tokens.types.js';
import type { Palette } from '../palette.js';

/**
 * DOES THE PLACEMENT TABLE DESCRIBE THE THEME WE ACTUALLY SHIP?
 *
 * The table was not invented, it was READ off `vars.css` and `presets/dark.css`,
 * so the honest test is whether reading it back reproduces them — role by role,
 * both schemes, exactly. That is a stronger assertion than any hand-written
 * expectation: it fails the moment somebody retunes a role in the stylesheets
 * without moving the table, which is precisely the drift that made the shipped
 * theme and the contract disagree about the neutral family for months.
 *
 * `assignRoles` is fed the SHIPPED rungs rather than generated ones on purpose.
 * Generating them would test `generatePalette` and this at once, and a failure
 * would not say which — while feeding the real ones isolates the only question
 * this file asks: given these rungs, does each role point at the right one.
 */
const styles = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const toOklch = converter('oklch');
const deltaE = differenceEuclidean('oklch');

/** The declarations a browser would see for one scheme, in cascade order. */
const declarationsFor = (scheme: ColorScheme) => {
  const sources =
    scheme === 'light'
      ? [read('vars.css')]
      : [read('vars.css'), read('presets/dark.css')];
  const declared = new Map<string, string>();
  for (const css of sources) {
    for (const [name, value] of parseCssVars(css)) declared.set(name, value);
  }
  return declared;
};

/** Every `--fm-palette-*` rung in those declarations, resolved, as a Palette. */
const paletteFrom = (declared: ReadonlyMap<string, string>): Palette => {
  const palette: Record<string, Record<number, string>> = {};
  for (const family of PALETTE_FAMILIES) palette[family] = {};

  for (const [name, raw] of declared) {
    const match = /^--fm-palette-([a-z]+)-(\d+)$/.exec(name);
    if (!match) continue;
    const [, family, step] = match;
    if (!(family in palette)) continue;
    palette[family][Number(step)] = resolveCssVar(raw, declared);
  }
  return palette as Palette;
};

describe.each(['light', 'dark'] as const)('assignRoles — %s', (scheme) => {
  const declared = declarationsFor(scheme);
  const palette = paletteFrom(declared);
  const theme = assignRoles(palette, scheme);

  it('assigns EVERY role in the contract, and nothing else', () => {
    expect(Object.keys(theme).sort()).toEqual([...COLOR_ROLES].sort());
  });

  it('reproduces the shipped stylesheet, role by role', () => {
    const drift: string[] = [];

    for (const role of COLOR_ROLES) {
      const shipped = toOklch(
        parseColor(
          resolveCssVar(declared.get(`--fm-color-${role}`) ?? '', declared),
        ),
      );
      const placed = toOklch(parseColor(theme[role]));
      if (!shipped || !placed) {
        drift.push(`${role}: unparsable`);
        continue;
      }
      // A hair of tolerance for formatting round-trips only: the rungs are the
      // SAME resolved values on both sides, so anything beyond this is a role
      // pointing somewhere else, not a rounding difference.
      const d = deltaE(shipped, placed);
      if (d > 0.001) drift.push(`${role}: ΔE ${d.toFixed(4)}`);

      // Alpha is part of the colour, and `scrim` is the only role that carries
      // one — a comparison blind to it would pass an opaque scrim.
      const alphaShipped = shipped.alpha ?? 1;
      const alphaPlaced = placed.alpha ?? 1;
      if (Math.abs(alphaShipped - alphaPlaced) > 0.001) {
        drift.push(`${role}: alpha ${alphaShipped} vs ${alphaPlaced}`);
      }
    }

    expect(
      drift,
      `${drift.length} role(s) drifted:\n  ${drift.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('assignRoles — refusals', () => {
  const declared = declarationsFor('light');
  const palette = paletteFrom(declared);

  it('THROWS when a rung a placement names is absent, listing the roles', () => {
    // The failure this prevents: an undefined role resolves to its `@property`
    // initial-value — opaque black, with nothing falsy to detect — so the theme
    // would look complete to every check that inspects what is present.
    const withoutNeutral: Palette = { ...palette, neutral: {} };

    expect(() => assignRoles(withoutNeutral, 'light')).toThrow(
      /has no rung for \d+ role\(s\)/,
    );
  });

  it('names the ROLE and the rung it wanted, not just a count', () => {
    const thin: Palette = {
      ...palette,
      primary: { 700: palette.primary[700] as string },
    };

    expect(() => assignRoles(thin, 'light')).toThrow(
      /primary-hover -> primary-800/,
    );
  });

  it('refuses a light palette asked for a dark theme', () => {
    // Dark reads steps up to 1300; a nine-rung light ramp cannot serve it, and
    // the whole point of throwing is that this is loud rather than black.
    expect(() => assignRoles(palette, 'dark')).toThrow(/no rung for/);
  });
});
