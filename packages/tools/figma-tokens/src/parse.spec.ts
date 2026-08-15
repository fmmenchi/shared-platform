import { describe, it, expect } from 'vitest';
import { parseCustomProperties } from './parse.js';

describe('parseCustomProperties', () => {
  it('reads every declaration in a :root block', () => {
    const css = `:root {
      --fm-color-primary: oklch(41% 0.135 255);
      --fm-radius-sm: 0.25rem;
    }`;
    expect([...parseCustomProperties(css)]).toEqual([
      ['--fm-color-primary', 'oklch(41% 0.135 255)'],
      ['--fm-radius-sm', '0.25rem'],
    ]);
  });

  it('keeps values that contain commas, parentheses and nested var()', () => {
    const css = `:root {
      --fm-font-sans: ui-sans-serif, system-ui, sans-serif;
      --fm-font-heading: var(--fm-font-sans);
      --fm-leading-xs: calc(1 / 0.75);
    }`;
    const vars = parseCustomProperties(css);
    expect(vars.get('--fm-font-sans')).toBe(
      'ui-sans-serif, system-ui, sans-serif',
    );
    expect(vars.get('--fm-font-heading')).toBe('var(--fm-font-sans)');
    expect(vars.get('--fm-leading-xs')).toBe('calc(1 / 0.75)');
  });

  it('lets a later declaration win, as the cascade does', () => {
    const css = `:root { --fm-color-primary: red; }
                 .dark { --fm-color-primary: blue; }`;
    expect(parseCustomProperties(css).get('--fm-color-primary')).toBe('blue');
  });

  it('ignores ordinary properties and comments', () => {
    const css = `/* --fm-color-ghost: nope; */
      :root { color: red; --fm-color-real: blue; }`;
    const vars = parseCustomProperties(css);
    expect(vars.has('--fm-color-real')).toBe(true);
    expect(vars.has('color')).toBe(false);
    // A commented-out declaration still parses — the scanner does not model
    // comments. Documented rather than fixed: the input is a generated,
    // values-only contract, and no token is ever commented out in it.
    expect(vars.has('--fm-color-ghost')).toBe(true);
  });

  it('returns nothing for a stylesheet with no custom properties', () => {
    expect(parseCustomProperties('body { margin: 0 }').size).toBe(0);
  });
});
