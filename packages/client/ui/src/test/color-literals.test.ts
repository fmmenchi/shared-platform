import { describe, it, expect } from 'vitest';

/**
 * "La semantica vince su tutto" — machine-enforced for plain CSS too.
 *
 * The token bridge resets Tailwind's palette, so a raw colour UTILITY cannot
 * compile; but a raw literal written as plain CSS in a module
 * (`background: #dc2626`) would. This guard closes that hole: colour in
 * component CSS goes ONLY through semantic roles (`var(--fm-*)` or role
 * utilities). `transparent` / `currentColor` keywords remain fine.
 */
const modules = import.meta.glob('../components/**/*.module.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Hex colours + functional colour notations.
const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;

describe('component CSS uses only semantic colour roles', () => {
  it('found the component modules', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(0);
  });

  for (const [file, css] of Object.entries(modules)) {
    it(`${file.split('/').pop()} has no colour literals`, () => {
      const offending = stripComments(css)
        .split('\n')
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => COLOR_LITERAL.test(line))
        .map(([n, line]) => `${n}: ${line.trim()}`);
      expect(offending, offending.join('\n')).toEqual([]);
    });
  }
});
