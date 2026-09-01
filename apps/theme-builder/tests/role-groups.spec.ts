import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  COLOR_ROLES,
  CONTRAST_PAIRS,
  colorVar,
  generateTheme,
  parseTheme,
  validateTheme,
} from '@fmmenchi/theme';
import { wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';
import { WIZARD_RAMP } from '../app/ramp';
import {
  ROLE_GROUPS,
  UNGROUPED_PAIRS,
  UNGROUPED_ROLES,
} from '../app/role-groups';

const require = createRequire(import.meta.url);
const declared = parseTheme(
  readFileSync(require.resolve('@fmmenchi/tokens/styles/vars.css'), 'utf8'),
);

describe('the role groups', () => {
  it('cover every role exactly once', () => {
    // The grouping is built from the same pieces `COLOR_ROLES` is assembled from, so
    // this cannot drift — which is worth asserting precisely because it cannot: a
    // family or suffix added to the contract must land in a group without an edit to
    // the app, and silence is not evidence of that.
    const grouped = ROLE_GROUPS.flatMap((group) => group.roles);

    expect(new Set(grouped).size, 'a role is in two groups').toBe(
      grouped.length,
    );
    expect([...grouped].sort()).toEqual([...COLOR_ROLES].sort());
    expect(UNGROUPED_ROLES).toEqual([]);
  });

  it('cover every declared pair exactly once', () => {
    const grouped = ROLE_GROUPS.flatMap((group) => group.pairs);

    expect(grouped.length).toBe(CONTRAST_PAIRS.length);
    expect(UNGROUPED_PAIRS).toEqual([]);
  });

  it('put a pair under the group that owns its BACKGROUND', () => {
    // The choice this pins: a pairing is a thing sitting ON a surface, so it belongs
    // to the surface. `primary × primary-foreground` is primary's business; grouping
    // it by the foreground would file half the contract under the foregrounds.
    for (const group of ROLE_GROUPS) {
      for (const [bg] of group.pairs) {
        expect(group.roles, `${bg} in ${group.title}`).toContain(bg);
      }
    }
  });
});

describe('what the page shows and what the gate says', () => {
  const theme = generateTheme(declared, REFERENCE_BASES, WIZARD_RAMP);

  /** Exactly the computation the page performs, per row. */
  const shownAsFailing = () =>
    CONTRAST_PAIRS.filter(([bg, fg, minimum]) => {
      const ratio = wcagContrast(theme[bg], theme[fg]);
      return ratio === undefined || ratio < minimum;
    }).map(([bg, fg]) => `${bg} × ${fg}`);

  const gateFailing = () =>
    validateTheme(theme).flatMap((violation) =>
      violation.pair ? [violation.pair.join(' × ')] : [],
    );

  it('agree on the shipped brand', () => {
    // Both empty is the weak form of agreement, so the next test does the other half.
    expect(gateFailing()).toEqual([]);
    expect(shownAsFailing()).toEqual([]);
  });

  it('agree that a role pointed somewhere absurd breaks its pairs', () => {
    // `primary` at rung 200 is a pale wash under white text: the page shows 1.74:1
    // against a 4.5 floor, and the gate must name the same pairs. If these ever
    // parted, the wizard would be reassuring somebody about a theme CI refuses.
    const broken = new Map([
      ...declared,
      [colorVar('primary'), 'var(--fm-palette-primary-200)'],
    ]);
    const brokenTheme = generateTheme(broken, REFERENCE_BASES, WIZARD_RAMP);

    const shown = CONTRAST_PAIRS.filter(([bg, fg, minimum]) => {
      const ratio = wcagContrast(brokenTheme[bg], brokenTheme[fg]);
      return ratio === undefined || ratio < minimum;
    }).map(([bg, fg]) => `${bg} × ${fg}`);

    const gate = validateTheme(brokenTheme).flatMap((violation) =>
      violation.pair ? [violation.pair.join(' × ')] : [],
    );

    expect(
      shown.length,
      'nothing broke — the fixture is not absurd enough',
    ).toBeGreaterThan(0);
    // The gate is allowed to be MORE forgiving than the raw ratio, because
    // `-disabled` pairs are exempt under WCAG 1.4.3. It must never be stricter, and
    // every pair it names must be one the page marks.
    for (const pair of gate) {
      expect(shown, `the gate fails ${pair} and the page does not`).toContain(
        pair,
      );
    }
  });
});
