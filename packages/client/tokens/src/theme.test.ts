import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COLOR_ROLES } from '@fmmenchi/theme';
import { parseTheme, toTheme } from '@fmmenchi/theme';
import { validateTheme } from '@fmmenchi/theme';

const styles = join(dirname(fileURLToPath(import.meta.url)), 'styles');
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

const VARS = read('vars.css');
const DARK = read('presets/dark.css');

describe('parseTheme', () => {
  it('reads the declarations, not the theme', () => {
    const declared = parseTheme(VARS);
    // Palette rungs are in there too: this step has no opinion about roles.
    expect(declared.get('--fm-palette-primary-base')).toMatch(/^oklch\(/);
    expect(declared.has('--fm-color-primary')).toBe(true);
  });

  it('merges sources in cascade order, a later declaration winning', () => {
    const light = parseTheme(VARS).get('--fm-palette-primary-base');
    const dark = parseTheme(VARS, DARK).get('--fm-palette-primary-base');
    expect(dark).not.toBe(light);
  });

  it('ignores a declaration that is commented out', () => {
    const declared = parseTheme('/* --fm-color-primary: red; */');
    expect(declared.has('--fm-color-primary')).toBe(false);
  });
});

describe('toTheme', () => {
  it('resolves every role of the shipped light theme', () => {
    const theme = toTheme(parseTheme(VARS));
    expect(Object.keys(theme).sort()).toEqual([...COLOR_ROLES].sort());
  });

  it('RESOLVES values rather than carrying references', () => {
    const theme = toTheme(parseTheme(VARS));
    // A role points at a rung, and a rung is relative colour off the base.
    expect(theme.primary).not.toContain('var(');
    expect(theme.primary).not.toContain('from ');
    expect(theme.primary).toMatch(/^oklch\(/);
  });

  it('REFUSES a preset read alone, rather than returning a hole', () => {
    // dark.css points at greys only vars.css declares. Half a theme that looks
    // whole is the one thing a caller cannot detect, so this throws.
    expect(() => toTheme(parseTheme(DARK))).toThrow(/never declared/);
  });

  it('feeds validateTheme directly: both shipped themes are allowed', () => {
    expect(validateTheme(toTheme(parseTheme(VARS)))).toEqual([]);
    expect(validateTheme(toTheme(parseTheme(VARS, DARK)))).toEqual([]);
  });
});
