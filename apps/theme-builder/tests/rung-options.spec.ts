import { describe, expect, it } from 'vitest';

import { homeFamilyOf, orderRungOptions } from '../app/role-overrides';

/**
 * A ROLE'S RUNG MENU OFFERS EVERY FAMILY, IN THE ORDER THAT ROLE READS THEM.
 *
 * Own family first, `neutral` second, the rest as they came — and NOTHING dropped,
 * which is the half of the rule a sort could quietly break. The complaint was that
 * `primary`'s own rungs sat under `accent`, `info`, `negative` and `neutral` in an
 * alphabetical list; the wrong fix was a filter, because every `-foreground` points at
 * `neutral-0` and `background`, `border` and `muted` are neutral too.
 */
const FAMILIES = [
  ['accent', ['500']],
  ['info', ['500']],
  ['negative', ['500']],
  ['neutral', ['0', '500']],
  ['primary', ['500']],
  ['secondary', ['500']],
] as const;

describe('orderRungOptions', () => {
  it('puts the home family first and neutral second, and keeps everything', () => {
    const ordered = orderRungOptions(FAMILIES, 'primary');

    expect(ordered.map(([family]) => family)).toEqual([
      'primary',
      'neutral',
      'accent',
      'info',
      'negative',
      'secondary',
    ]);
    expect(ordered).toHaveLength(FAMILIES.length);
  });

  it('puts neutral first for a neutral role, with no duplicate', () => {
    const ordered = orderRungOptions(FAMILIES, 'neutral');

    expect(ordered[0]?.[0]).toBe('neutral');
    expect(ordered.filter(([family]) => family === 'neutral')).toHaveLength(1);
  });

  it('leaves the list as it came when the role has no home', () => {
    // A colour stated outright points into no family; there is nothing to promote
    // except neutral, which still moves up.
    expect(orderRungOptions(FAMILIES, undefined).map(([f]) => f)).toEqual([
      'neutral',
      'accent',
      'info',
      'negative',
      'primary',
      'secondary',
    ]);
  });

  it('does not mutate the shared list', () => {
    const copy = [...FAMILIES];
    orderRungOptions(FAMILIES, 'secondary');
    expect(FAMILIES).toEqual(copy);
  });
});

describe('homeFamilyOf', () => {
  it('reads the family out of a plain pointer and out of one with alpha', () => {
    expect(homeFamilyOf('var(--fm-palette-primary-700)')).toBe('primary');
    expect(
      homeFamilyOf('oklch(from var(--fm-palette-negative-500) l c h / 0.4)'),
    ).toBe('negative');
  });

  it('answers nothing for a colour stated outright, or no declaration', () => {
    expect(homeFamilyOf('oklch(0.98 0 0)')).toBeUndefined();
    expect(homeFamilyOf(undefined)).toBeUndefined();
  });
});
