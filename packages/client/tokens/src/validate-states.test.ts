import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseTheme, toTheme } from '@fmmenchi/theme';
import { validateRoles } from '@fmmenchi/theme';
import { validateStates } from '@fmmenchi/theme';

/**
 * Polarity is MEASURED from the background, not declared, so the same delta is
 * right in one theme and wrong in the other. The dark half had no test: every
 * broken fixture in `styles.test.ts` starts from the light theme, so `darkens` was
 * never false when a violation was due.
 */

const styles = join(dirname(fileURLToPath(import.meta.url)), 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const light = toTheme(parseTheme(read('vars.css')));
const dark = toTheme(parseTheme(read('vars.css'), read('presets/dark.css')));

describe('validateStates', () => {
  /**
   * Polarity is MEASURED from the background, not declared, so the same delta is
   * right in one theme and wrong in the other. This is the half that had no test:
   * a dark theme whose hover DARKENS is going the wrong way.
   */
  it('catches a state ramping the wrong way for a DARK theme', () => {
    const broken = { ...dark, 'primary-hover': dark['primary-active'] ?? '' };
    const darker = { ...broken, 'primary-hover': 'oklch(30% 0.13 256)' };

    const messages = validateStates(validateRoles(darker).parsable).map(
      (v) => v.message,
    );
    expect(messages.join('\n')).toMatch(/wrong way for a dark theme/);
  });

  it('accepts the same direction in the theme it belongs to', () => {
    // The shipped dark preset lightens, and is allowed; the light one darkens.
    expect(validateStates(validateRoles(dark).parsable)).toEqual([]);
    expect(validateStates(validateRoles(light).parsable)).toEqual([]);
  });
});
