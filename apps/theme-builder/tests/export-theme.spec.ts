import {
  COLOR_ROLES,
  PALETTE_FAMILIES,
  colorVar,
  toTheme,
  validateTheme,
} from '@fmmenchi/theme';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { readDeclarations } from '../app/declarations.server';
import { hydrateDeclarations } from '../app/declarations';
import { buildThemeFile } from '../app/export-theme';
import { REFERENCE_RAMP } from '../app/ramp';

/**
 * THE HANDOFF, TESTED FROM THE READER'S END.
 *
 * The wizard's whole output is this file, and the useful question is not "does it
 * have the keys I put in it" — that tests the loop that wrote them. It is whether
 * the GENERATOR can do its job with it: `--from` reads `declarations`, resolves
 * them, and validates before writing. So the test does the same, with the same
 * functions, and a file that cannot survive that is a file that fails on a
 * consumer's machine instead of here.
 *
 * The declarations are the real ones, read from the shipped `vars.css`, for the
 * reason a fixture could not: "the shipped brand exports cleanly" only means
 * something if the roles and the greys are the ones that ship.
 */
const declared = hydrateDeclarations(readDeclarations());

const asMap = (declarations: Record<string, string>) =>
  new Map(Object.entries(declarations));

describe('buildThemeFile', () => {
  it('describes a theme the generator would accept', () => {
    // THE ONE THAT MATTERS. `toTheme` follows the var() chains and evaluates the
    // relative colours; `validateTheme` is the function CI runs and the generator
    // runs before it writes. Nothing else in this suite would catch a file that
    // resolves to an unreadable theme.
    const { declarations } = buildThemeFile(
      declared,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    const violations = validateTheme(
      toTheme(asMap(declarations)) as Record<string, string>,
    );

    expect(violations, violations.map((v) => v.message).join('\n')).toEqual([]);
  });

  it('keeps the roles as ALIASES, so the theme is not a photograph', () => {
    // The promise the format rests on: a consumer changing one rung moves every
    // role that points at it. A file of 84 resolved colours has the same pixels and
    // nothing left to recompute.
    const { declarations } = buildThemeFile(
      declared,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    const roles = COLOR_ROLES.map((role) => declarations[colorVar(role)]);

    expect(roles.every((value) => value !== undefined)).toBe(true);
    // 83 of the 84 are a plain var(); `scrim` is a relative colour off one. Neither
    // is a bare literal, which is what a photograph would be.
    expect(
      roles.filter((value) => (value as string).includes('var(--fm-palette-'))
        .length,
    ).toBe(COLOR_ROLES.length);
  });

  it('carries all three layers', () => {
    const { declarations } = buildThemeFile(
      declared,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    for (const family of PALETTE_FAMILIES) {
      expect(
        declarations[`--fm-palette-${family}-base`],
        `${family} base`,
      ).toMatch(/^oklch\(/);
      expect(
        declarations[`--fm-palette-${family}-500`],
        `${family} rung`,
      ).toMatch(/^oklch\(/);
    }

    // And the greys, which no brand supplies (ADR-0032) — without them a
    // `[data-theme]` block is inert for 34 of the 84 roles, because a custom
    // property resolves where it is DECLARED.
    expect(declarations['--fm-palette-neutral-0']).toBeTypeOf('string');
  });

  it('lets the BRAND win over the stylesheet it read', () => {
    // The merge that would be invisible if it were wrong: the file would carry the
    // reference palette however the form was filled, and every role would still
    // resolve, and validation would still pass.
    const { declarations } = buildThemeFile(
      declared,
      { ...REFERENCE_BASES, primary: '#ff00ff' },
      REFERENCE_RAMP,
    );

    expect(declarations['--fm-palette-primary-base']).not.toBe(
      declared.get('--fm-palette-primary-base'),
    );
    // Magenta's hue, ~328 in OKLCH, rather than the reference blue's 255.
    expect(declarations['--fm-palette-primary-base']).toMatch(/ 3[0-9.]+\)$/);
  });

  it('emits values that do not move between engines', () => {
    // Measured the hard way once: unrounded, the same bases produced values
    // differing at the seventeenth decimal between Node and Chromium, so a
    // downloaded file was not byte-identical to a generated one.
    const { declarations } = buildThemeFile(
      declared,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    // Every number the file writes, wherever it sits: a base is a literal and a rung
    // is now an offset and a factor inside `calc()`, so scan for numbers rather than
    // for a shape.
    for (const [name, value] of Object.entries(declarations)) {
      if (!name.includes('-palette-')) continue;
      for (const number of value.match(/[0-9]*\.[0-9]+/g) ?? []) {
        const places = (number.split('.')[1] ?? '').length;
        expect(places, `${name}: ${value}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('carries a RE-POINTED role, because an override is just a changed declaration', () => {
    // The claim step three rests on. Re-pointing a role is replacing its one
    // declaration, so nothing downstream needs to know overrides exist —
    // `generateTheme` reads the aliases out of what it is handed, and this copies
    // the role layer verbatim. If that stopped being true, the wizard would show a
    // change it did not export.
    const repointed = new Map([
      ...declared,
      [colorVar('primary'), 'var(--fm-palette-accent-600)'],
    ]);

    const { declarations } = buildThemeFile(
      repointed,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    expect(declarations[colorVar('primary')]).toBe(
      'var(--fm-palette-accent-600)',
    );
    // And the theme it describes still passes, since the rung it now points at is a
    // real one.
    expect(
      validateTheme(toTheme(asMap(declarations)) as Record<string, string>),
    ).toEqual([]);
  });

  it('carries a re-pointed SCRIM with its alpha intact', () => {
    // `scrim` is the one role written as a rung seen THROUGH something, and it was
    // the one row of 84 with no control until the second spelling was handled.
    // Re-pointing it must not turn a wash into an opaque slab.
    const repointed = new Map([
      ...declared,
      [
        colorVar('scrim'),
        'oklch(from var(--fm-palette-neutral-500) l c h / 0.92)',
      ],
    ]);

    const { declarations } = buildThemeFile(
      repointed,
      REFERENCE_BASES,
      REFERENCE_RAMP,
    );

    expect(declarations[colorVar('scrim')]).toContain('neutral-500');
    expect(declarations[colorVar('scrim')]).toContain('/ 0.92');
  });

  it('keeps what the builder needs to reopen it, where the generator will not read it', () => {
    const file = buildThemeFile(declared, REFERENCE_BASES, REFERENCE_RAMP);

    expect(file.builder.bases).toEqual(REFERENCE_BASES);
    expect(file.builder.ramp).toEqual(REFERENCE_RAMP);
    // `declarations` is the generator's whole contract, so the record above cannot
    // reach it and cannot become a token nobody declared.
    expect(
      Object.keys(file.declarations).every((k) => k.startsWith('--fm-')),
    ).toBe(true);
  });
});
