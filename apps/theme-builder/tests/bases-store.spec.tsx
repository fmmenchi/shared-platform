import { deriveDarkBases, type Bases } from '@fmmenchi/theme';
import { act, render } from '@testing-library/react';
import { converter, formatHex, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import {
  BasesProvider,
  DARK_BASE_LIGHTNESS,
  REFERENCE_BASES,
  REFERENCE_DARK_BASES,
  useBases,
} from '../app/bases';

/**
 * THE DARK SEVEN FOLLOW THE LIGHT SEVEN UNTIL SOMEBODY TYPES ONE, and both halves of
 * that need a test because the store had each of them wrong in turn.
 *
 * It began as "re-derive on every light change", which discards dark colours a
 * person had typed. That was corrected to "never automatic" — and never automatic is
 * what the EXPORT was measured doing wrong: change the light primary to `#1f5fa8` and
 * the dark file still carried the derivation of the reference blue, chroma 0.1007
 * where the brand's is 0.1107. Half the handoff was the design system's own colours,
 * and nothing said so.
 *
 * So the rule has two sides, and a test that checks one of them would let the other
 * come back. Untouched, there is no work to lose and following is free; touched,
 * nothing may overwrite it, ever.
 */

/** Reads the store out of the provider so a test can act on it. */
function withStore() {
  const seen: { current: ReturnType<typeof useBases> | null } = {
    current: null,
  };

  function Probe() {
    seen.current = useBases();
    return null;
  }

  render(
    <BasesProvider>
      <Probe />
    </BasesProvider>,
  );

  return {
    get store() {
      if (!seen.current) throw new Error('The probe never rendered.');
      return seen.current;
    },
  };
}

const toOklch = converter('oklch');

/** What the derivation says these light seven suggest, as the store spells it. */
const suggestion = (light: Bases): Bases =>
  Object.fromEntries(
    Object.entries(deriveDarkBases(light, DARK_BASE_LIGHTNESS)).map(
      ([family, value]) => [family, formatHex(parse(value) ?? '#000000')],
    ),
  ) as Bases;

const A_BRAND: Bases = { ...REFERENCE_BASES, primary: '#1f5fa8' };
const ANOTHER: Bases = { ...REFERENCE_BASES, primary: '#8844cc' };

describe('the bases store', () => {
  it('opens on the reference pair, with dark following', () => {
    const { store } = withStore();

    expect(store.bases).toEqual(REFERENCE_BASES);
    expect(store.darkBases).toEqual(REFERENCE_DARK_BASES);
    expect(store.darkFollowsLight).toBe(true);
  });

  it('moves the dark seven when the light seven change and nobody has typed one', () => {
    const probe = withStore();

    act(() => probe.store.setBases(A_BRAND));

    expect(probe.store.bases).toEqual(A_BRAND);
    expect(probe.store.darkBases).toEqual(suggestion(A_BRAND));
    expect(probe.store.darkFollowsLight).toBe(true);
  });

  it('carries the BRAND’s chroma into dark, not the reference’s', () => {
    // The measurement that bought this rule, stated as the assertion: the exported
    // dark theme has to be a fact about the brand somebody entered.
    const probe = withStore();
    const referenceChroma = toOklch(parse(REFERENCE_DARK_BASES.primary))?.c;

    act(() => probe.store.setBases(A_BRAND));

    const chroma = toOklch(parse(probe.store.darkBases.primary))?.c;
    expect(chroma).toBeCloseTo(
      toOklch(parse(suggestion(A_BRAND).primary))?.c as number,
      3,
    );
    expect(chroma).not.toBeCloseTo(referenceChroma as number, 3);
  });

  it('STOPS following the moment a dark colour is typed', () => {
    const probe = withStore();

    act(() =>
      probe.store.setDarkBases({
        ...probe.store.darkBases,
        primary: '#66ccff',
      }),
    );

    expect(probe.store.darkFollowsLight).toBe(false);
  });

  it('never overwrites a typed dark colour, however often the light ones change', () => {
    // The whole of what "never automatic" was protecting, kept.
    const probe = withStore();

    act(() =>
      probe.store.setDarkBases({
        ...probe.store.darkBases,
        primary: '#66ccff',
      }),
    );
    act(() => probe.store.setBases(A_BRAND));
    act(() => probe.store.setBases(ANOTHER));

    expect(probe.store.darkBases.primary).toBe('#66ccff');
    expect(probe.store.darkFollowsLight).toBe(false);
  });

  it('re-derives to the light seven AS THEY STAND, and resumes following', () => {
    const probe = withStore();

    act(() =>
      probe.store.setDarkBases({
        ...probe.store.darkBases,
        primary: '#66ccff',
      }),
    );
    act(() => probe.store.setBases(ANOTHER));
    act(() => probe.store.deriveFromLight());

    expect(probe.store.darkBases).toEqual(suggestion(ANOTHER));
    expect(probe.store.darkFollowsLight).toBe(true);

    // and following works again afterwards, which is what makes it a resumption
    // rather than a one-off recomputation
    act(() => probe.store.setBases(A_BRAND));
    expect(probe.store.darkBases).toEqual(suggestion(A_BRAND));
  });

  it('puts the follow back on reset', () => {
    const probe = withStore();

    act(() =>
      probe.store.setDarkBases({
        ...probe.store.darkBases,
        primary: '#66ccff',
      }),
    );
    act(() => probe.store.reset());

    expect(probe.store.bases).toEqual(REFERENCE_BASES);
    expect(probe.store.darkBases).toEqual(REFERENCE_DARK_BASES);
    expect(probe.store.darkFollowsLight).toBe(true);
  });
});
