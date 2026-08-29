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
  TEXT_TOKENS,
} from './index.js';
import { CONTRAST_PAIRS, validateTheme } from './validate.js';
import { readVars } from './generate.js';
import { resolveValue } from './resolve.js';

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

/**
 * ONE PARSER, shared with the generator.
 *
 * This file had its own, and it was anchored on nothing — so it read a
 * declaration anywhere in the text, including one commented OUT during a retune.
 * Everything here then passed on a role the shipped CSS does not define:
 * completeness saw it, the contrast maths read its value out of the comment, and
 * the role resolved at runtime to the `@property` initial-value. Black, on every
 * consumer, in both themes, with the suite green.
 *
 * `readVars` strips comments and throws on a duplicate, which is what the local
 * one asserted.
 */
const parseVars = readVars;

/**
 * Resolve a declared value to the colour a browser would paint: references
 * expanded AND the relative-colour ramp evaluated.
 *
 * The local expander this replaced only followed `var()`. Since ADR-0032 a role
 * points at a palette step and the step is `oklch(from …)`, so following the
 * reference now lands on an expression culori cannot read — every assertion
 * below would fail for the one reason a gate must never fail: it can no longer
 * see what it is checking. `resolve.ts` evaluates that one form, and refuses
 * any other rather than guessing.
 */
function resolve(map: Map<string, string>, value: string): string {
  return resolveValue(value, map);
}

/**
 * The primitive layer, which is NOT the contract.
 *
 * `--fm-<family>-base` and `--fm-palette-*` are internal: no component may read
 * them, no theme has to assign them, and the Tailwind bridge does not expose
 * them. They are excluded from the completeness comparison for that reason, and
 * asserted separately below — the contract is still exactly the semantic roles.
 */
const isPrimitive = (name: string) => name.startsWith('--fm-palette-');

const light = parseVars(read('vars.css'));
const dark = parseVars(read('presets/dark.css'));
const bridge = read('tailwind.css').replace(/\s+/g, '');

/**
 * A preset is an OVERRIDE on `:root`, not a standalone stylesheet.
 *
 * Since ADR-0032 that distinction has teeth: the dark preset re-pitches the
 * BASES and remaps the roles, but the ramp steps between them are declared once
 * in `vars.css` and inherited. Resolving a dark role against the dark file
 * alone therefore dead-ends at a palette step the file does not contain — which
 * is not a broken token, it is the cascade doing its job. Every value assertion
 * resolves against the cascade; completeness still asserts the pure map, because
 * what a preset must ASSIGN is a different question from what it can SEE.
 */
const darkCascade = new Map([...light, ...dark]);

describe('contract completeness', () => {
  it('vars.css defines exactly the contract', () => {
    const defined = [...light.keys()].filter((n) => !isPrimitive(n)).sort();
    expect(defined).toEqual([...TOKEN_VARS].sort());
  });

  it('every palette step a role points at exists', () => {
    // The failure this prevents is silent and total: an unresolvable `var()`
    // leaves the role at its `@property` initial-value — black, on every
    // consumer, in both themes. Cheap to check, invisible otherwise.
    for (const [name, value] of light) {
      for (const [, referenced] of value.matchAll(/var\((--fm-[a-z0-9-]+)/g)) {
        expect(light.has(referenced as string), `${name} → ${referenced}`).toBe(
          true,
        );
      }
    }
  });

  it('the dark preset assigns exactly every color role + the shadows', () => {
    // Elevation is theme-dependent (light's 4-12% black shadows vanish on a
    // dark background), so shadows are the one non-color override a preset
    // makes; everything else non-color inherits.
    const defined = [...dark.keys()].filter((n) => !isPrimitive(n)).sort();
    expect(defined).toEqual(
      [
        ...COLOR_ROLES.map(colorVar),
        ...SHADOW_TOKENS.map((t) => `--fm-shadow-${t}`),
      ].sort(),
    );
  });

  it('every color value parses as a color, in both themes', () => {
    // Each theme resolves against ITS OWN cascade. This used to resolve both
    // against `light`, which worked only while the two presets happened to name
    // the same palette steps — the dark ramp has its own (0…1300, stepping 0.05
    // because it works against the lightness ceiling), and the light map does
    // not contain them.
    for (const [theme, scope] of [
      [light, light],
      [dark, darkCascade],
    ] as const) {
      for (const role of COLOR_ROLES) {
        const raw = theme.get(colorVar(role));
        if (!raw) continue; // completeness asserted above
        const value = resolve(scope, raw);
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

  // The pair, both halves. Deleting a `--text-<step>--line-height` line left
  // `Heading` and `DialogHeading` on the UA's `normal` leading with
  // every gate green — measured — because `TOKEN_VARS` only proves the `--fm-*`
  // variables are DECLARED, never that they reach the bridge.
  it('bridges the type scale, size AND leading, for every step', () => {
    for (const step of TEXT_TOKENS) {
      expect(bridge, `--text-${step} is not bridged`).toContain(
        `--text-${step}:var(--fm-text-${step});`,
      );
      expect(bridge, `--text-${step}--line-height is not bridged`).toContain(
        `--text-${step}--line-height:var(--fm-leading-${step});`,
      );
    }
  });

  // The leading is unitless on purpose: an absolute one is inherited as a
  // frozen number, so a descendant that changes its font-size keeps the
  // ancestor's line box. Measured before this assertion existed: `<small>`
  // inside a `text-sm` block went from 16.67px to 20px.
  it('keeps every leading a RATIO, never a length', () => {
    for (const step of TEXT_TOKENS) {
      const value = light.get(`--fm-leading-${step}`);
      expect(value, `--fm-leading-${step} is missing`).toBeTruthy();
      expect(
        value,
        `--fm-leading-${step} is "${value}" — a length freezes on inheritance`,
      ).not.toMatch(/\d\s*(rem|em|px|pt|%)/);
    }
  });

  it("resets Tailwind's own text steps (semantic-only enforcement)", () => {
    expect(bridge).toContain('--text-*:initial;');
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

/*
 * An INDEPENDENT read of the file on disk, and that is all it is now.
 *
 * It used to be the thing that stopped the registrations drifting from the
 * contract. They cannot: `properties.css` is generated FROM the contract, and
 * `generate.test.ts` compares it byte for byte. What is left here is worth
 * keeping for one reason only — it parses the shipped file with different code
 * and different assumptions, so a generator that renders something plausible and
 * wrong still has to get past a reader that never saw it.
 */
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
    expect(validateTheme(toTheme(darkCascade))).toEqual([]);
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
      ['dark', darkCascade],
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
    ['dark', darkCascade],
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
