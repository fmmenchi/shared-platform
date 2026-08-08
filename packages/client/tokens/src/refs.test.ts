import { describe, it, expect } from 'vitest';
import { vars } from './refs.js';
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
  Object.values(vars).flatMap((group) => Object.values(group));

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
    expect(vars.color['primary-foreground']).toBe(
      'var(--fm-color-primary-foreground)',
    );
    expect(vars.space['inset-m']).toBe('var(--fm-space-inset-m)');
    expect(vars['font-weight'].semibold).toBe('var(--fm-font-weight-semibold)');
    expect(vars['border-width'].emphasis).toBe(
      'var(--fm-border-width-emphasis)',
    );
  });

  it('keeps the type pair together', () => {
    // `--fm-text-<step>` ships with `--fm-leading-<step>`, and a consumer
    // reaching for one has the other under the same key.
    for (const step of Object.keys(vars.text)) {
      expect(vars.leading).toHaveProperty(step);
    }
    expect(Object.keys(vars.text)).toEqual(Object.keys(vars.leading));
  });
});
