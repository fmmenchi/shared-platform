import { describe, it, expect } from 'vitest';

import { REGISTERED_SECTIONS, toPixels } from './emit-properties.js';

/**
 * What the emitter itself gets right, asked here rather than where the artefact
 * lands. The test that compares the rendered file to `vars.css` lives in
 * `@fmmenchi/tokens`, because it needs that stylesheet and this package may not
 * reach across the boundary to read it.
 */
describe('toPixels', () => {
  it('refuses a length the browser would reject', () => {
    // Passing it through unchanged was the first version, and it is the worst
    // option: the browser drops the WHOLE `@property` rule, silently, and the
    // token loses its type. Nothing downstream can see that — Stylelint has no
    // rule for it and the contract test only greps for `rem`.
    expect(() => toPixels('0.5em')).toThrow(/not absolute/);
    expect(() => toPixels('clamp(4px, 1vw, 8px)')).toThrow();
    expect(() => toPixels('calc(0.5rem + 2px)')).toThrow();
    expect(() => toPixels('var(--x)')).toThrow();
    expect(() => toPixels('1.2.3rem')).toThrow();
  });

  it('converts a length to one the browser will accept', () => {
    // `initial-value` has to be computationally independent, and `rem` is not:
    // the browser rejects the whole `@property` rule, silently, and the token
    // loses its type. Converted from the real value rather than restated beside
    // it — which is what the hand-written file did, with nothing to fail if the
    // two stopped agreeing.
    expect(toPixels('0.25rem')).toBe('4px');
    expect(toPixels('0.375rem')).toBe('6px');
    expect(toPixels('0.75rem')).toBe('12px');
    // Already independent: left alone.
    expect(toPixels('4px')).toBe('4px');
  });
});

describe('REGISTERED_SECTIONS', () => {
  it('names each token once', () => {
    // A role landing in two sections would emit two `@property` rules for it —
    // the last one wins, so the duplicate is invisible in the output and only
    // shows up as a section heading that lies.
    const registered = REGISTERED_SECTIONS.flatMap((section) => section.vars);

    expect(new Set(registered).size).toBe(registered.length);
  });
});
