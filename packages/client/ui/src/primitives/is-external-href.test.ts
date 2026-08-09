import { describe, it, expect } from 'vitest';
import { isExternalHref } from './is-external-href.js';

describe('isExternalHref', () => {
  it.each([
    ['https://example.com/docs', true],
    ['http://example.com', true],
    ['mailto:hello@example.com', true],
    ['tel:+390612345', true],
    ['blob:https://example.com/abc', true],
    ['//cdn.example.com/logo.svg', true], // protocol-relative
    ['HTTPS://EXAMPLE.COM', true], // schemes are case-insensitive
    ['/settings', false],
    ['/settings/profile', false],
    ['settings/profile', false], // relative
    ['#section', false],
    ['?q=1', false],
    ['', false],
    [undefined, false],
  ])('%s → %s', (href, expected) => {
    expect(isExternalHref(href)).toBe(expected);
  });

  it('does not read a colon INSIDE a path as a scheme', () => {
    // The regex is anchored for this. Unanchored, or written as
    // `href.includes(':')`, every one of these leaves the router — and the two
    // that matter are real: a matrix parameter, and a date in a slug.
    for (const href of ['/a/b:c', '/reports/2024:q1', '/x?t=12:30']) {
      expect(isExternalHref(href), href).toBe(false);
    }
  });

  it('never reads the browser to decide', async () => {
    // An origin comparison is the obvious implementation and it is the wrong
    // one here: this module is imported on the server, where there is no
    // `location`, and a link that resolved one way in the server HTML and
    // another after hydration is the worst kind of difference — it looks right
    // until the first click. Asserted on the SOURCE, because a jsdom/browser
    // test always has a `window` and so can never see this.
    const source = (await import('./is-external-href.js?raw')).default;
    // Comments stripped first — the prose above the function names all three
    // to say it does not use them, and matching that is matching the opposite
    // of what this asserts.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\b(window|location|document)\b/);
    // The stripping itself has to work, or the assertion passes on an empty
    // string no matter what the function does.
    expect(code).toContain('isExternalHref');
  });
});
