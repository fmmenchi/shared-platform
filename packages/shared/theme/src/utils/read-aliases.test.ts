import { describe, expect, it } from 'vitest';

import { readAliases } from './read-aliases.js';
import { colorVar } from '../tokens.types.js';

/**
 * `readAliases` had no test at all, and it is the one reader whose failure mode is
 * SILENCE: a role it cannot classify is left out of the map, and the caller sees a
 * theme with a missing role rather than a parser that could not cope. That is the
 * right behaviour — a hand-written brand preset states colours outright and must
 * still be readable — but it means a regex that quietly stops matching costs a role
 * with nothing to announce it.
 *
 * Fixtures are built here rather than read from `vars.css`: this is a `scope:shared`
 * package and must not reach into a `scope:client` one, even by file path. The suite
 * that asks whether the SHIPPED stylesheet is read correctly lives in
 * `@fmmenchi/tokens`, beside the stylesheet.
 */
const declaring = (values: Record<string, string>) =>
  new Map(Object.entries(values));

describe('readAliases', () => {
  it('reads the rung a role points at', () => {
    const aliases = readAliases(
      declaring({ [colorVar('primary')]: 'var(--fm-palette-primary-700)' }),
    );

    expect(aliases.get('primary')).toEqual({
      family: 'primary',
      step: 700,
    });
  });

  it('reads a rung seen through an alpha', () => {
    // `scrim` is the one role written as a relative colour: take that rung, keep
    // its channels, change its alpha.
    const aliases = readAliases(
      declaring({
        [colorVar('scrim')]:
          'oklch(from var(--fm-palette-neutral-900) l c h / 0.6)',
      }),
    );

    expect(aliases.get('scrim')).toEqual({
      family: 'neutral',
      step: 900,
      alpha: 0.6,
    });
  });

  it('reads a declaration wrapped across lines', () => {
    // `vars.css` wraps its relative-colour rungs over three lines to stay inside the
    // format gate, so this is the shape the real stylesheet presents.
    //
    // It works because `\s` spans a newline and the anchors carry no `m` flag — NOT
    // because of the whitespace normalisation in `readAliases`, which was measured
    // by removing it: all of these still pass. Kept as a regression test all the
    // same, because tightening a `\s+` to a literal space, or adding `m`, would
    // break the real file while every single-line fixture kept passing.
    const aliases = readAliases(
      declaring({
        [colorVar('scrim')]: `oklch(
            from var(--fm-palette-neutral-900) l c h / 0.6
          )`,
      }),
    );

    expect(aliases.get('scrim')?.step).toBe(900);
  });

  it('SKIPS a role that states a colour outright', () => {
    // Not an error: a brand preset may name its own colours, and a reader that threw
    // on the first literal could not read one at all. `generateTheme` is where a
    // missing role becomes a failure, because that is where completeness is decided.
    const aliases = readAliases(
      declaring({
        [colorVar('primary')]: 'oklch(41% 0.135 255)',
        [colorVar('card')]: 'var(--fm-palette-neutral-0)',
      }),
    );

    expect(aliases.has('primary')).toBe(false);
    expect(aliases.get('card')?.step).toBe(0);
  });

  it('SKIPS a relative colour that changes a channel, rather than misreading it', () => {
    // THE DEFECT THIS EXISTS TO PREVENT. A ramp expression names a rung AND alters
    // it, so reading the rung out of it would report a placement whose colour is not
    // the colour the role resolves to — a plausible, WRONG entry, which is worse
    // than an absent one. The regex is narrow on purpose; this is what keeps it so.
    //
    // Both forms carry an alpha, and that is the point of writing them this way: a
    // fixture without one is refused for the missing `/ 0.6` no matter how loose the
    // channel spec is, so it would pass against a regex that had stopped checking
    // the channels at all. Measured — widening `\s+l\s+c\s+h\s*` to accept anything
    // fails these two and nothing else in this file.
    const aliases = readAliases(
      declaring({
        [colorVar('primary')]:
          'oklch(from var(--fm-palette-primary-700) calc(l - 0.1) c h / 0.6)',
        [colorVar('scrim')]:
          'oklch(from var(--fm-palette-neutral-900) l calc(c * 0.5) h / 0.6)',
      }),
    );

    expect(aliases.has('primary')).toBe(false);
    expect(aliases.has('scrim')).toBe(false);
  });

  it('reads only roles the contract has', () => {
    // Driven by `COLOR_ROLES`, so a `--fm-color-*` that is not a role cannot enter
    // the map and be placed into a generated theme.
    const aliases = readAliases(
      declaring({
        '--fm-color-invented': 'var(--fm-palette-primary-700)',
        [colorVar('primary')]: 'var(--fm-palette-primary-700)',
      }),
    );

    expect(aliases.size).toBe(1);
    expect([...aliases.keys()]).toEqual(['primary']);
  });

  it('returns an empty map for a stylesheet with no roles', () => {
    // And it must be EMPTY rather than throwing, because the caller distinguishing
    // "nothing declared" from "nothing parseable" is what made an earlier empty-CSS
    // bug legible: an empty map yields an empty theme and the validator names every
    // missing role.
    expect(readAliases(declaring({})).size).toBe(0);
  });
});
