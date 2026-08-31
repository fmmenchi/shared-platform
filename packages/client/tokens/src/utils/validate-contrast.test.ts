import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseTheme, toTheme } from '../theme.js';
import { validateContrast } from './validate-contrast.js';
import { validateRoles } from './validate-roles.js';

/**
 * Both floors on one pair, and the skip that keeps a failure from being reported
 * twice — a pair whose halves did not parse is `validateRoles`' to report.
 */

const styles = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const light = toTheme(parseTheme(read('vars.css')));

describe('validateContrast', () => {
  it('measures both floors, and names the pair that fails', () => {
    const theme = { ...light, 'primary-foreground': light['primary'] ?? '' };
    const kinds = validateContrast(theme, validateRoles(theme).parsable).map(
      (v) => v.kind,
    );

    // A fill inked with itself fails on both metrics at once.
    expect(kinds).toContain('contrast');
    expect(kinds).toContain('apca');
  });

  it('skips a pair whose halves did not parse, rather than reporting it twice', () => {
    const theme = { ...light, 'primary-foreground': 'not-a-colour' };
    const { parsable } = validateRoles(theme);

    expect(
      validateContrast(theme, parsable).filter((v) =>
        v.pair?.includes('primary-foreground'),
      ),
    ).toEqual([]);
  });
});
