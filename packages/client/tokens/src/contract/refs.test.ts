import { describe, it, expect } from 'vitest';
import { tokenVars } from './refs.js';
import { TOKEN_VARS } from './tokens.js';

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
