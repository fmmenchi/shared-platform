import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const bar = () => screen.getByRole('progressbar');

/**
 * The background a rule DECLARES for one of the progress pseudo-elements.
 *
 * Chromium does not expose `::-webkit-progress-value` and friends to
 * `getComputedStyle` — it answers with the originating element's style — so the
 * stylesheet is the only place the declaration can be read back from.
 */
const declaredBackground = (pseudo: string): string | undefined => {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin
    }
    const walk = (list: CSSRuleList): string | undefined => {
      for (const rule of Array.from(list)) {
        const selector = (rule as CSSStyleRule).selectorText;
        if (
          selector?.includes(pseudo) &&
          !selector.includes(':indeterminate') &&
          !selector.includes('forced-colors')
        ) {
          const value = (rule as CSSStyleRule).style.backgroundColor;
          if (value) return value;
        }
        if ('cssRules' in rule) {
          const found = walk((rule as CSSGroupingRule).cssRules);
          if (found) return found;
        }
      }
      return undefined;
    };
    const found = walk(rules);
    if (found) return found;
  }
  return undefined;
};

describe('Progress', () => {
  it('is the platform element, named by its label', () => {
    render(<Progress label="Upload" value={0.4} />);

    // THE ELEMENT, not a div wearing the role. Everything below — the role, the
    // value, the percentage a screen reader announces, indeterminate from the
    // absence of `value` — is the platform's, and none of it is ours to keep in
    // step.
    expect(bar().tagName).toBe('PROGRESS');
    expect(bar()).toHaveAccessibleName('Upload');
  });

  it('carries the value and the maximum it was given', () => {
    render(<Progress label="Import" value={30} max={100} />);
    expect(bar()).toHaveAttribute('value', '30');
    expect(bar()).toHaveAttribute('max', '100');
  });

  it('is indeterminate when no value is given, and not when one is', () => {
    const { rerender } = render(<Progress label="Upload" />);

    // `:indeterminate` is the browser's own answer, so this asserts the fact
    // the stylesheet branches on rather than a prop we happen to store.
    expect(bar()).not.toHaveAttribute('value');
    expect(bar().matches(':indeterminate')).toBe(true);

    rerender(<Progress label="Upload" value={0.4} />);
    expect(bar().matches(':indeterminate')).toBe(false);
  });

  it('treats zero as a value, not as unknown', () => {
    render(<Progress label="Upload" value={0} />);

    // The distinction the prop documentation promises: `0` says the work has
    // not started, and omitting `value` says nobody knows how long it will
    // take. A falsy check somewhere in the middle would collapse the two, and
    // this is the assertion that would catch it.
    expect(bar()).toHaveAttribute('value', '0');
    expect(bar().matches(':indeterminate')).toBe(false);
  });

  it('lets aria-labelledby outrank the label', () => {
    render(
      <>
        <span id="importing">Importing contacts</span>
        <Progress label="Import" aria-labelledby="importing" value={0.5} />
      </>,
    );
    expect(bar()).toHaveAccessibleName('Importing contacts');
  });

  it('forwards ref to the underlying progress element', () => {
    const ref = { current: null as HTMLProgressElement | null };
    render(<Progress label="Upload" ref={ref} value={0.4} />);
    expect(ref.current).toBeInstanceOf(HTMLProgressElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Progress label="Upload" value={0.4} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('what it actually paints (real computed styles in Chromium)', () => {
    it('draws a groove of its own rather than the user agent’s', () => {
      render(<Progress label="Upload" value={0.4} />);
      const style = getComputedStyle(bar());

      // `appearance: none` is the first line of the stylesheet and the reason
      // every rule after it is needed: without it the engines paint their own
      // control and ignore the colours below.
      expect(style.appearance).toBe('none');
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('paints the fill, which `appearance: none` would otherwise remove', () => {
      render(<Progress label="Upload" value={0.4} />);

      // READ FROM THE STYLESHEET, not from `getComputedStyle`, and that is a
      // measurement rather than a preference: asked for
      // `::-webkit-progress-value`, Chromium returns the ORIGINATING element's
      // style — the groove — so the first version of this test compared the
      // track with itself and passed for the wrong reason. These pseudo-elements
      // are user-agent internals and are not exposed to the CSSOM that way.
      //
      // What can still be asserted is that the declarations ship, which is the
      // regression that matters: with the UA appearance off and no rule for the
      // fill, a `<progress>` renders as an empty groove at every value — a
      // component that looks like it works and shows nothing.
      const fill = declaredBackground('::-webkit-progress-value');
      const track = declaredBackground('::-webkit-progress-bar');

      expect(fill).toBeTruthy();
      // Distinguishable from the groove, which is what makes the bar readable
      // as a bar (WCAG 1.4.11 — `muted × primary` is declared in
      // `CONTRAST_PAIRS`).
      expect(fill).not.toBe(track);

      // THE GECKO RULE IS NOT ASSERTED HERE, and pretending otherwise is what
      // the second version of this test did. Chromium DISCARDS a rule whose
      // selector it does not recognise at parse time, so `::-moz-progress-bar`
      // is absent from the CSSOM of the only engine this suite runs in —
      // measured: the lookup returns `undefined` while the declaration is
      // plainly in the source. A one-engine suite cannot speak for the other
      // two, and an assertion that says it can is worse than none.
      expect(declaredBackground('::-moz-progress-bar')).toBeUndefined();
    });

    it('sweeps only while it is indeterminate', () => {
      const { rerender } = render(<Progress label="Upload" />);
      expect(getComputedStyle(bar()).animationName).not.toBe('none');

      rerender(<Progress label="Upload" value={0.4} />);
      // A determinate bar animates its fill by transition, never by a loop —
      // an endless sweep on a bar that knows its value says the opposite of
      // what the value says.
      expect(getComputedStyle(bar()).animationName).toBe('none');
    });

    it('rounds its ends, because the radius is half the height', () => {
      render(<Progress label="Upload" value={0.4} />);
      const style = getComputedStyle(bar());
      const height = parseFloat(style.blockSize);
      const radius = parseFloat(style.borderStartStartRadius);

      // The pair the stylesheet documents: override one without the other and
      // the bar stops being a pill. Written as an assertion so the pairing
      // survives a retune of either token.
      expect(radius).toBeCloseTo(height / 2, 1);
    });
  });

  describe('a11y', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ];

    for (const { name, theme } of themes) {
      it(`no violations — determinate and indeterminate / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Progress label="Upload" value={0.4} />
            <Progress label="Import" />
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
