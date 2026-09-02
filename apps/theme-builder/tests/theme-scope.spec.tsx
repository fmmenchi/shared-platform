import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeScope } from '../app/theme-scope';

/**
 * THE PREVIEW'S WHOLE MECHANISM — a theme applied to a subtree and nowhere else.
 *
 * SCOPED, NEVER GLOBAL, and that is the property worth a test: a theme with a
 * contrast pair below its floor must not take down the controls that would fix it, so
 * the wizard's chrome has to keep the reference theme while the preview renders under
 * the one being built.
 *
 * IT REPLACED A CSS STRING, and the thing it replaced is why the preview never
 * worked. `draft-theme.tsx` held the draft as generated CSS and NOTHING EVER CALLED
 * `setCss` — a provider, a scope, a `color-scheme` fix and three specs, all for a
 * string no code produced. The page said "No draft yet" for every possible set of
 * bases, and its own specs passed, because they asserted the empty state and the
 * behaviour of a `css` prop the tests supplied themselves.
 *
 * So these assert the applied case with a REAL theme shape, and the empty case as the
 * exception rather than the norm.
 */
const THEME = {
  primary: 'oklch(0.42 0.1219 255)',
  background: 'oklch(0.21 0.02 256)',
} as unknown as Parameters<typeof ThemeScope>[0]['theme'];

describe('ThemeScope', () => {
  it('sets every role as a custom property on the subtree', () => {
    const { container } = render(
      <ThemeScope theme={THEME} scheme="dark">
        <span>inside</span>
      </ThemeScope>,
    );

    const scope = container.firstElementChild as HTMLElement;
    expect(scope.style.getPropertyValue('--fm-color-primary')).toBe(
      'oklch(0.42 0.1219 255)',
    );
    expect(scope.style.getPropertyValue('--fm-color-background')).toBe(
      'oklch(0.21 0.02 256)',
    );
  });

  it('sets `color-scheme`, because the browser paints its own controls from it', () => {
    // A select's popup and a native checkbox read nothing from the roles. Without
    // this a dark theme previews with white native lists on Safari and Firefox, which
    // is a recorded defect of hand-written presets.
    const { container } = render(
      <ThemeScope theme={THEME} scheme="dark">
        <span>inside</span>
      </ThemeScope>,
    );

    expect((container.firstElementChild as HTMLElement).style.colorScheme).toBe(
      'dark',
    );
  });

  it('applies NOTHING but the scheme when there is no theme', () => {
    // The honest empty state: the reference theme shows through, untouched. It is not
    // the normal case any more — the preview derives a theme from the bases it always
    // has — so it is asserted as the exception.
    const { container } = render(
      <ThemeScope theme={null} scheme="light">
        <span>inside</span>
      </ThemeScope>,
    );

    const scope = container.firstElementChild as HTMLElement;
    expect(scope.style.getPropertyValue('--fm-color-primary')).toBe('');
    expect(scope.style.colorScheme).toBe('light');
  });

  it('never touches the document, only its own subtree', () => {
    // The whole reason this is a scope. If it wrote to `:root` the wizard's chrome
    // would render under the draft, and a failing theme would take the page with it.
    const before =
      document.documentElement.style.getPropertyValue('--fm-color-primary');

    render(
      <ThemeScope theme={THEME} scheme="dark">
        <span>inside</span>
      </ThemeScope>,
    );

    expect(
      document.documentElement.style.getPropertyValue('--fm-color-primary'),
    ).toBe(before);
    expect(document.body.style.getPropertyValue('--fm-color-primary')).toBe('');
  });

  it('merges the caller’s style, and the roles win', () => {
    // The preview paints `background: var(--fm-color-background)` on the scope
    // itself, because the page behind it belongs to the wizard's chrome — so the
    // custom properties have to be set on the SAME element for that `var()` to
    // resolve to the theme. And a caller must not be able to shadow a role by
    // accident, which is why they are applied last.
    const { container } = render(
      <ThemeScope
        theme={THEME}
        scheme="dark"
        style={{
          padding: '1rem',
          ['--fm-color-primary' as string]: 'red',
        }}
      >
        <span>inside</span>
      </ThemeScope>,
    );

    const scope = container.firstElementChild as HTMLElement;
    expect(scope.style.padding).toBe('1rem');
    expect(scope.style.getPropertyValue('--fm-color-primary')).toBe(
      'oklch(0.42 0.1219 255)',
    );
  });
});
