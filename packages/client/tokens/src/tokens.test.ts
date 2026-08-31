import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseColor, wcagContrast } from 'culori';
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
import { themeAdvisories, validateTheme } from './theme.js';
import { tokenVars } from './tokens.types.js';
import { readVars } from './utils/css.js';
import { toTheme } from './theme.js';
import { resolveValue } from './utils/css.js';

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
  /**
   * The measurement moved into `validateTheme()`; this asserts the SHIPPED
   * presets against it rather than repeating the arithmetic.
   *
   * It used to compute |Lc| here, which meant the pipeline enforced a floor the
   * public verdict did not — so a theme could pass a builder calling
   * `validateTheme()` and fail this file. One implementation, asked in one
   * place; the policy is unchanged (hard floor |Lc| 45, the 60 body-text
   * guideline advisory).
   */
  for (const [name, vars] of [
    ['light', light],
    ['dark', darkCascade],
  ] as const) {
    it(`text pairs stay above the |Lc| 45 floor in ${name}`, () => {
      const theme = toTheme(vars);
      const failures = validateTheme(theme)
        .filter((v) => v.kind === 'apca')
        .map((v) => v.message);

      const advisories = themeAdvisories(theme).map((a) => a.message);
      if (advisories.length > 0) {
        console.warn(`APCA advisory (${name}):\n  ${advisories.join('\n  ')}`);
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});

/**
 * THE REFERENCES AND THE CONTRACT ARE THE SAME LIST, and this is the only place
 * that can say so.
 *
 * `vars` is derived from the same `as const` arrays `TOKEN_VARS` is derived
 * from, so the two cannot disagree about the names WITHIN a group. What they
 * can disagree about is which groups exist: adding a token family to
 * `TOKEN_VARS` and forgetting it here leaves a whole group of tokens with no
 * typed reference and nothing to say so — the drift this export exists to
 * prevent, reappearing one level up.
 */
const flatten = (): string[] =>
  Object.values(tokenVars).flatMap((group) => Object.values(group));

describe('token references', () => {
  it('reads back every variable the contract requires', () => {
    // Set equality both ways: a missing group fails the first, an invented one
    // fails the second. Sorted, because neither list promises an order.
    const referenced = flatten().sort();
    const required = TOKEN_VARS.map((name) => `var(${name})`).sort();

    expect(referenced).toEqual(required);
  });

  it('holds no duplicates', () => {
    const referenced = flatten();
    // Two groups sharing a prefix would silently answer for each other's
    // tokens — `text` and `leading` are built from the SAME name list and are
    // the shape that makes this possible.
    expect(new Set(referenced).size).toBe(referenced.length);
  });

  it('is a reference, never a value', () => {
    // The distinction the whole export rests on: a reference re-points when
    // `[data-theme]` changes, a value copied at build time does not.
    for (const reference of flatten()) {
      expect(reference).toMatch(/^var\(--fm-[a-z0-9-]+\)$/);
    }
  });

  it('spells its keys the way the tokens are spelled', () => {
    // No second vocabulary. `primary-foreground` finds the CSS, the contract
    // and the call site, because all three spell it the same.
    expect(tokenVars.color['primary-foreground']).toBe(
      'var(--fm-color-primary-foreground)',
    );
    expect(tokenVars.space['inset-m']).toBe('var(--fm-space-inset-m)');
    expect(tokenVars['font-weight'].semibold).toBe(
      'var(--fm-font-weight-semibold)',
    );
    expect(tokenVars['border-width'].emphasis).toBe(
      'var(--fm-border-width-emphasis)',
    );
  });

  it('keeps the type pair together, and the two halves apart', () => {
    // `--fm-text-<step>` ships with `--fm-leading-<step>`, so a consumer
    // reaching for one has the other under the same key.
    expect(Object.keys(tokenVars.text)).toEqual(Object.keys(tokenVars.leading));

    // AND EACH POINTS AT ITS OWN HALF. The two groups are built from the SAME
    // name list, so transposing their prefixes produces an identical multiset
    // of strings — set equality, no-duplicates and the shape check all stay
    // green, and `tokenVars.text.lg` quietly returns a LEADING. A `1.75`
    // line-height ratio applied as a font-size, on every consumer, in a patch
    // release. These two lines are the only thing that can see it.
    expect(tokenVars.text.lg).toBe('var(--fm-text-lg)');
    expect(tokenVars.leading.lg).toBe('var(--fm-leading-lg)');
  });

  it('cannot be written to, at the type level or at runtime', () => {
    // The emitted `.d.ts` says `readonly`, which `as const` alone does not
    // make true: without the freeze a single consumer doing what they think is
    // a theming hook corrupts the module singleton for every other importer in
    // the process.
    expect(Object.isFrozen(tokenVars)).toBe(true);
    // The groups too: freezing only the outer object leaves writable every
    // surface anybody would actually reach for.
    for (const group of Object.values(tokenVars)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
    expect(() => {
      // @ts-expect-error — readonly, and this asserts the type says so.
      tokenVars.color.primary = 'oops';
    }).toThrow();
  });

  it('rejects a name that is not a token', () => {
    // THE ONE BENEFIT THIS EXPORT EXISTS FOR, and every other test here is a
    // runtime one that would still pass if `TokenRefGroup` were relaxed to
    // `Record<string, string>`. `@ts-expect-error` fails the `typecheck` target
    // if the error stops happening, which is the only way to assert it.
    // @ts-expect-error — `primry` is not a colour role.
    expect(tokenVars.color.primry).toBeUndefined();
  });
});
