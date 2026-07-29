import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, parse as parseColor, wcagContrast } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import {
  BREAKPOINTS,
  CONTAINER_BREAKPOINTS,
  COLOR_ROLES,
  RADIUS_TOKENS,
  SHADOW_TOKENS,
  SPACE_TOKENS,
  TOKEN_VARS,
  colorVar,
} from './index.js';
import { CONTRAST_PAIRS, validateTheme } from './validate.js';

/**
 * Validation of the token contract — this is what makes a theme "allowed":
 * 1. `vars.css` defines EXACTLY the contract (no missing, no stray vars).
 * 2. the `dark` preset assigns EXACTLY every color role (a theme = complete
 *    color assignment; non-color tokens inherit).
 * 3. every color value actually parses as a color (typo guard).
 * 4. the Tailwind bridge covers every color role (a role outside the bridge
 *    yields a silently-missing utility — the bridge-coverage pitfall).
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

  it('the dark preset assigns exactly every color role + the shadows', () => {
    // Elevation is theme-dependent (light's 4-12% black shadows vanish on a
    // dark background), so shadows are the one non-color override a preset
    // makes; everything else non-color inherits.
    const defined = [...dark.keys()].sort();
    expect(defined).toEqual(
      [
        ...COLOR_ROLES.map(colorVar),
        ...SHADOW_TOKENS.map((t) => `--fm-shadow-${t}`),
      ].sort(),
    );
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
    expect(bridge).toContain('--container-*:initial;');
    for (const [name, value] of Object.entries(CONTAINER_BREAKPOINTS)) {
      expect(bridge).toContain(`--container-${name}:${value}`);
    }
  });
});

describe('@property registrations (typed tokens — ADR-0012)', () => {
  const properties = read('properties.css').replace(/\s+/g, '');
  const registered = (name: string, syntax: string) =>
    properties.includes(
      `@property--fm-${name}{syntax:'${syntax}';inherits:true;`,
    );

  it('registers every color role as an inheriting <color>', () => {
    for (const role of COLOR_ROLES) {
      expect(
        registered(`color-${role}`, '<color>'),
        `properties.css is missing @property --fm-color-${role}`,
      ).toBe(true);
    }
  });

  it('registers every radius token as an inheriting <length>', () => {
    for (const t of RADIUS_TOKENS) {
      expect(
        registered(`radius-${t}`, '<length>'),
        `properties.css is missing @property --fm-radius-${t}`,
      ).toBe(true);
    }
  });

  it('keeps initial-value a throwaway placeholder, never a real token value', () => {
    // Single-source guarantee: the type layer must NOT re-declare real values
    // (which would drift from vars.css). Colours use the sentinel oklch(0 0 0)
    // (whitespace-stripped: `oklch(000)`); radius uses px (rem is rejected for a
    // non-universal syntax) — never a rem, never the real radius rem literals.
    expect(properties).not.toMatch(/initial-value:[^;]*rem/);
    // Every colour initial-value is the sentinel — same count as the roles.
    const colorInitials =
      properties.match(
        /syntax:'<color>';inherits:true;initial-value:([^;]+);/g,
      ) ?? [];
    expect(colorInitials.length).toBe(COLOR_ROLES.length);
    for (const decl of colorInitials) {
      expect(decl.endsWith('initial-value:oklch(000);')).toBe(true);
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

  it('the validator reports broken state relationships (self-check)', () => {
    const broken = { ...toTheme(light) };
    broken['primary-hover'] = broken['primary']; // flat ramp
    broken['secondary-hover'] = 'oklch(60% 0.05 256)'; // lighter on a light theme
    broken['accent-disabled'] = broken['accent']; // disabled = enabled
    const kinds = validateTheme(broken).map((v) => v.kind);
    expect(
      kinds.filter((k) => k === 'state-ramp').length,
    ).toBeGreaterThanOrEqual(2);
    expect(kinds).toContain('indistinct-disabled');
  });
});

describe('perceivability advisories (logged, not gated)', () => {
  // WCAG 1.4.1: links must be distinguishable from surrounding text — 3:1 or a
  // non-colour cue. The DS mandates UNDERLINED links in prose (the non-colour
  // cue), so this is an advisory, not a gate; same for a selected item's
  // surface, whose state is also carried by its foreground change.
  it('logs link-vs-foreground and selection-vs-surface ratios', () => {
    const themeOf = (vars: Map<string, string>): Record<string, string> => {
      const theme: Record<string, string> = {};
      for (const role of COLOR_ROLES) {
        const raw = vars.get(colorVar(role));
        if (raw !== undefined) theme[role] = resolve(vars, raw);
      }
      return theme;
    };
    for (const [name, theme] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      const t = themeOf(theme);
      const linkVsText = wcagContrast(t['link'], t['foreground']);
      const selVsCard = wcagContrast(t['selection'], t['card']);
      if (linkVsText < 3) {
        console.log(
          `  [${name}] link vs foreground: ${linkVsText.toFixed(2)} (< 3 — prose links MUST be underlined)`,
        );
      }
      if (selVsCard < 3) {
        console.log(
          `  [${name}] selection vs card: ${selVsCard.toFixed(2)} (< 3 — selected state must not rely on the wash alone)`,
        );
      }
      expect(theme).toBeDefined();
    }
  });
});

describe('APCA (advisory + floor)', () => {
  // WCAG 2.x ratios are a blunt instrument, especially on dark themes; APCA
  // (the WCAG 3 draft metric) is more perceptually accurate. Policy: the HARD
  // gate stays WCAG AA (the legal/standard bar) + an APCA FLOOR of |Lc| ≥ 45
  // (large/bold-text tier — our smallest text is font-medium button labels);
  // pairs under the body-text guideline (|Lc| < 60) are logged as advisory,
  // not failed.
  const toRgb = converter('rgb');
  const Y = (value: string) => {
    const c = toRgb(parseColor(value));
    if (!c) throw new Error(`unparsable: ${value}`);
    const ch = (x: number) => Math.min(255, Math.max(0, Math.round(x * 255)));
    return sRGBtoY([ch(c.r), ch(c.g), ch(c.b)]);
  };

  const toTheme = (vars: Map<string, string>): Record<string, string> => {
    const theme: Record<string, string> = {};
    for (const role of COLOR_ROLES) {
      const raw = vars.get(colorVar(role));
      if (raw !== undefined) theme[role] = resolve(vars, raw);
    }
    return theme;
  };

  for (const [name, vars] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it(`text pairs stay above the |Lc| 45 floor in ${name}`, () => {
      const theme = toTheme(vars);
      const advisories: string[] = [];
      const failures: string[] = [];
      for (const [bg, fg, minimum] of CONTRAST_PAIRS) {
        if (minimum !== 4.5) continue; // text pairs only
        const lc = Math.abs(Number(APCAcontrast(Y(theme[fg]), Y(theme[bg]))));
        if (lc < 45) failures.push(`${bg} × ${fg}: |Lc| ${lc.toFixed(1)} < 45`);
        else if (lc < 60)
          advisories.push(
            `${bg} × ${fg}: |Lc| ${lc.toFixed(1)} (< 60 body-text guideline)`,
          );
      }
      if (advisories.length > 0) {
        console.warn(`APCA advisory (${name}):\n  ${advisories.join('\n  ')}`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
