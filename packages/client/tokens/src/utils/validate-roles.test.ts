import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseTheme, toTheme } from '../validate.js';
import { validateRoles } from './validate-roles.js';

/**
 * `styles.test.ts` runs this through `validateTheme` against broken themes, which
 * covers the common cases as they are used. Two branches had nothing to make them
 * fire, and a check nothing can trigger is indistinguishable from one that does not
 * work: `out-of-gamut`, because every fixture there is displayable, and
 * `unparsable-color`, because a fixture built from a real theme always parses.
 */

const styles = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const light = toTheme(parseTheme(read('vars.css')));

describe('validateRoles', () => {
  it('reports a value outside the sRGB gamut, and still parses it', () => {
    // Out-of-sRGB renders differently per browser, each gamut-mapping its own
    // way, so it silently falsifies contrast maths. Reported — and kept, so the
    // pairs it takes part in are still measured rather than hidden behind it.
    const theme = { ...light, primary: 'oklch(60% 0.4 145)' };
    const { violations, parsable } = validateRoles(theme);

    expect(violations.map((v) => v.kind)).toContain('out-of-gamut');
    expect(parsable.has('primary')).toBe(true);
  });

  it('reports a value that is not a colour at all, and drops it', () => {
    const theme = { ...light, primary: 'not-a-colour' };
    const { violations, parsable } = validateRoles(theme);

    expect(violations.map((v) => v.kind)).toContain('unparsable-color');
    expect(parsable.has('primary')).toBe(false);
  });

  it('says nothing about a theme that is whole and paintable', () => {
    expect(validateRoles(light).violations).toEqual([]);
  });
});
