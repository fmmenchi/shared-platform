import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseColor } from 'culori';
import {
  BREAKPOINTS,
  COLOR_ROLES,
  RADIUS_TOKENS,
  SPACE_TOKENS,
  TOKEN_VARS,
  colorVar,
} from './index.js';
import { validateTheme } from './validate.js';

/**
 * Validation of the token contract — this is what makes a theme "allowed":
 * 1. `vars.css` defines EXACTLY the contract (no missing, no stray vars).
 * 2. the `dark` preset assigns EXACTLY every color role (a theme = complete
 *    color assignment; non-color tokens inherit).
 * 3. every color value actually parses as a color (typo guard).
 * 4. the Tailwind bridge covers every color role (a role outside the bridge
 *    yields a silently-missing utility — the andes-routes pitfall).
 * 5. every declared pair meets WCAG AA in BOTH themes (text 4.5:1, focus ring
 *    3:1). `-disabled` pairs are exempt (WCAG 1.4.3 exception).
 */

const styles = dirname(fileURLToPath(import.meta.url)) + '/styles';
const read = (p: string) => readFileSync(join(styles, p), 'utf8');

/** Parse `--fm-*: value;` declarations (multi-line values supported). */
function parseVars(css: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of css.matchAll(/(--fm-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    expect(map.has(m[1]), `duplicate declaration of ${m[1]}`).toBe(false);
    map.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  return map;
}

/** Resolve one-or-more levels of `var(--fm-x)` references. */
function resolve(map: Map<string, string>, value: string, depth = 0): string {
  if (depth > 5) throw new Error(`var() resolution too deep: ${value}`);
  const m = value.match(/^var\((--fm-[a-z0-9-]+)\)$/);
  if (!m) return value;
  const next = map.get(m[1]);
  if (!next) throw new Error(`unresolved reference ${m[1]}`);
  return resolve(map, next, depth + 1);
}

const light = parseVars(read('vars.css'));
const dark = parseVars(read('presets/dark.css'));
const bridge = read('tailwind.css').replace(/\s+/g, '');

describe('contract completeness', () => {
  it('vars.css defines exactly the contract', () => {
    const defined = [...light.keys()].sort();
    expect(defined).toEqual([...TOKEN_VARS].sort());
  });

  it('the dark preset assigns exactly every color role', () => {
    const defined = [...dark.keys()].sort();
    expect(defined).toEqual(COLOR_ROLES.map(colorVar).sort());
  });

  it('every color value parses as a color, in both themes', () => {
    for (const role of COLOR_ROLES) {
      for (const theme of [light, dark]) {
        const raw = theme.get(colorVar(role));
        if (!raw) continue; // completeness asserted above
        const value = resolve(light, raw);
        expect(parseColor(value), `${colorVar(role)}: ${value}`).toBeDefined();
      }
    }
  });
});

describe('tailwind bridge', () => {
  it('resets the default palette (semantic-only enforcement)', () => {
    expect(bridge).toContain('--color-*:initial;');
  });

  it('bridges every color role to its --fm-* variable', () => {
    for (const role of COLOR_ROLES) {
      expect(
        bridge.includes(`--color-${role}:var(--fm-color-${role})`),
        `bridge is missing --color-${role}`,
      ).toBe(true);
    }
  });

  it('bridges radius and semantic spacing', () => {
    for (const t of RADIUS_TOKENS) {
      expect(
        bridge.includes(`--radius-${t}:var(--fm-radius-${t})`),
        `bridge is missing --radius-${t}`,
      ).toBe(true);
    }
    for (const t of SPACE_TOKENS) {
      expect(
        bridge.includes(`--spacing-${t}:var(--fm-space-${t})`),
        `bridge is missing --spacing-${t}`,
      ).toBe(true);
    }
  });

  it('declares exactly the TS breakpoints (no drift, no Tailwind defaults)', () => {
    expect(bridge).toContain('--breakpoint-*:initial;');
    for (const [name, value] of Object.entries(BREAKPOINTS)) {
      expect(bridge).toContain(`--breakpoint-${name}:${value}`);
    }
  });
});

describe('reference presets pass the PUBLIC validator (allowed-themes gate)', () => {
  // The exact validator apps run on their brand presets — completeness,
  // parseability and every CONTRAST_PAIR (AA text 4.5:1, ring/invalid 3:1;
  // `-disabled` pairs exempt per WCAG 1.4.3). Single source: validate.ts.
  const toTheme = (vars: Map<string, string>): Record<string, string> => {
    const theme: Record<string, string> = {};
    for (const role of COLOR_ROLES) {
      const raw = vars.get(colorVar(role));
      if (raw !== undefined) theme[role] = resolve(vars, raw);
    }
    return theme;
  };

  it('light (vars.css) is an allowed theme', () => {
    expect(validateTheme(toTheme(light))).toEqual([]);
  });

  it('dark preset is an allowed theme on its own (complete)', () => {
    expect(validateTheme(toTheme(dark))).toEqual([]);
  });

  it('the validator reports a broken theme (self-check)', () => {
    const broken = { ...toTheme(light) };
    broken['primary'] = broken['background']; // near-white fill on white text
    delete broken['ring'];
    (broken as Record<string, string>)['not-a-role'] = 'oklch(50% 0 0)';
    const kinds = validateTheme(broken).map((v) => v.kind);
    expect(kinds).toContain('contrast');
    expect(kinds).toContain('missing-role');
    expect(kinds).toContain('unknown-role');
  });
});
