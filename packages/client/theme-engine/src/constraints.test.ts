import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FAMILY_CONSTRAINTS } from './constraints.js';
import { readVars } from '@fmmenchi/tokens/read-vars';
import {
  ACTION_FAMILIES,
  COLOR_ROLES,
  STATUS_FAMILIES,
} from '@fmmenchi/tokens';

/**
 * A placement table is a claim ABOUT THE SHIPPED PALETTE — that `-hover` really
 * is one rung from the fill, that `-foreground` really is a neutral. If it were
 * merely plausible, a solver built on it would produce themes that do not look
 * like ours while every test stayed green.
 *
 * So these read `vars.css` and check the claims against it, by the reference each
 * role DECLARES rather than by resolving colours: what a role points at is the
 * decision, and the colour is downstream of it.
 */

/**
 * The stylesheets are read through the PUBLIC subpath, not by a relative path
 * into a sibling package's source. That is how a consumer reaches them, it is
 * what `describeSystem()` is given in the real flow, and a relative reach across
 * packages would be a coupling the module boundaries exist to forbid.
 */
const styleFile = (name: string): string =>
  fileURLToPath(import.meta.resolve(`@fmmenchi/tokens/styles/${name}`));

const vars = readVars(readFileSync(styleFile('vars.css'), 'utf8'));

/** `--fm-color-primary-hover: var(--fm-palette-primary-800)` → 800. */
function pointsAt(role: string): { source: string; step: number } | undefined {
  const declared = vars.get(`--fm-color-${role}`);
  if (declared === undefined) return undefined;
  const match = /var\(--fm-palette-([a-z]+)-(\d+)\)/.exec(declared);
  return match
    ? { source: match[1] as string, step: Number(match[2]) }
    : undefined;
}

describe('FAMILY_CONSTRAINTS', () => {
  it('covers every role of every family, and nothing else', () => {
    const covered = new Set(FAMILY_CONSTRAINTS.map((c) => c.role));
    const families = [...ACTION_FAMILIES, ...STATUS_FAMILIES];
    const expected = COLOR_ROLES.filter((role) =>
      families.some((f) => role === f || role.startsWith(`${f}-`)),
    );
    expect([...covered].sort()).toEqual([...expected].sort());
  });

  /**
   * An ink is measured against the fill AND both of its states, so it cannot be
   * chosen against the resting fill alone — a theme that did would go
   * unreadable the moment somebody hovered. Three floors, one role.
   */
  it('reads its floors from CONTRAST_PAIRS rather than restating them', () => {
    const ink = FAMILY_CONSTRAINTS.find((c) => c.role === 'primary-foreground');
    expect(ink?.floors).toEqual([
      { against: 'primary', ratio: 4.5, lc: 45 },
      { against: 'primary-hover', ratio: 4.5, lc: 45 },
      { against: 'primary-active', ratio: 4.5, lc: 45 },
    ]);
  });

  /**
   * A fill is under THREE floors, not one. It is a non-text indicator owing 3:1
   * on every surface it can sit on (WCAG 1.4.11). An earlier version of this
   * table kept a single `against` and returned the first match, which would have
   * let a solver satisfy `background` and quietly break the other two.
   */
  it('keeps every floor a role is under, not the first', () => {
    const fill = FAMILY_CONSTRAINTS.find((c) => c.role === 'primary');
    expect(fill?.floors.map((f) => f.against).sort()).toEqual([
      'background',
      'muted',
      'primary-subtle',
    ]);
    for (const floor of fill?.floors ?? []) expect(floor.ratio).toBe(3);
  });

  it('puts APCA only on text pairs', () => {
    const border = FAMILY_CONSTRAINTS.find((c) => c.role === 'error-border');
    expect(border?.floors.every((f) => f.ratio === 3)).toBe(true);
    expect(border?.floors.every((f) => f.lc === null)).toBe(true);

    const text = FAMILY_CONSTRAINTS.find((c) => c.role === 'error-foreground');
    expect(text?.floors.every((f) => f.lc === 45)).toBe(true);
  });

  it('exempts the disabled pair, per WCAG 1.4.3', () => {
    for (const c of FAMILY_CONSTRAINTS.filter((c) =>
      c.role.includes('-disabled'),
    )) {
      expect(c.placement.kind).toBe('exempt');
      expect(c.floors).toEqual([]);
    }
  });
});

describe('the placements describe the shipped palette', () => {
  it('places every action fill by anchor, and its states one and two rungs on', () => {
    for (const family of ACTION_FAMILIES) {
      const fill = pointsAt(family);
      const hover = pointsAt(`${family}-hover`);
      const active = pointsAt(`${family}-active`);
      expect(fill, family).toBeDefined();

      // The shipped ramp steps in hundreds, so one rung is +100.
      expect(hover?.step, `${family}-hover`).toBe((fill?.step ?? 0) + 100);
      expect(active?.step, `${family}-active`).toBe((fill?.step ?? 0) + 200);
      // And they stay inside their own family.
      expect(hover?.source).toBe(
        family === 'destructive' ? 'negative' : family,
      );
    }
  });

  it('inks every fill from the NEUTRAL scale, not from the family', () => {
    for (const family of [...ACTION_FAMILIES, ...STATUS_FAMILIES]) {
      expect(pointsAt(`${family}-foreground`)?.source, family).toBe('neutral');
    }
  });

  it('washes toward the surface, and inks the wash from the family', () => {
    for (const family of ACTION_FAMILIES) {
      const fill = pointsAt(family);
      const subtle = pointsAt(`${family}-subtle`);
      const subtleInk = pointsAt(`${family}-subtle-foreground`);
      // The wash is lighter than the fill in a light theme…
      expect(subtle?.step, `${family}-subtle`).toBeLessThan(fill?.step ?? 0);
      // …and its text is a rung of the same family, not a neutral.
      expect(subtleInk?.source, `${family}-subtle-foreground`).not.toBe(
        'neutral',
      );
      expect(subtleInk?.step, `${family}-subtle-foreground`).toBeGreaterThan(
        subtle?.step ?? 0,
      );
    }
  });
});
