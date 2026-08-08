import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VisuallyHidden } from './visually-hidden.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const spyWarn = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

// `vi.spyOn` hands back the SAME mock when console.warn is already spied, so
// without this the "does not warn" test inherits the previous test's calls and
// fails against a guard that is behaving correctly — which is what it did.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('VisuallyHidden', () => {
  it('takes no space on screen and stays in the accessibility tree', () => {
    render(<VisuallyHidden>3 unread messages</VisuallyHidden>);

    // BOTH HALVES, because either alone passes for the wrong reason. Measured
    // rather than read off a class: the mutant this kills is a `.visuallyHidden`
    // that lost its rule (or never matched a hashed class), which leaves the
    // text painted on every page of every consumer while a `toBeInTheDocument`
    // assertion stays green.
    const box = screen.getByText('3 unread messages').getBoundingClientRect();
    expect(box.height).toBeLessThan(4);
    expect(box.width).toBeLessThan(4);

    // And the opposite mutant: `display: none` would also measure 0×0 and would
    // take the text out of the accessibility tree, which is the one thing this
    // component must never do. `getByText` reads the DOM, so it is asserted
    // through a ROLE below, where the a11y tree is what answers.
    expect(screen.getByText('3 unread messages')).toBeInTheDocument();
  });

  it('puts the hiding on the element that had to exist anyway (`as`)', () => {
    render(<VisuallyHidden as="h2">Search results</VisuallyHidden>);

    // The heading is REAL — it is in the accessibility tree with its name, so a
    // reader gets the section the design chose not to draw. Wrapping instead
    // (`<h2><VisuallyHidden>…`) would leave the h2 itself in flow, an empty box
    // with a heading's own margins.
    const heading = screen.getByRole('heading', {
      name: 'Search results',
      level: 2,
    });
    expect(heading.tagName).toBe('H2');
    expect(heading.getBoundingClientRect().height).toBeLessThan(4);
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    let el: HTMLElement | null = null;
    render(
      <VisuallyHidden
        ref={(node) => {
          el = node;
        }}
      >
        Content
      </VisuallyHidden>,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('warns when something focusable is hidden inside it', async () => {
    const warn = spyWarn();
    render(
      <VisuallyHidden>
        <button type="button">Dismiss</button>
      </VisuallyHidden>,
    );

    // The failure axe cannot see: the button is present and named in the
    // accessibility tree, so an axe assertion passes — while a sighted keyboard
    // user tabs onto a control that is one pixel wide and the focus ring
    // vanishes (WCAG 2.4.7).
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('can be reached with Tab'),
      ),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<button>'));
  });

  it('does not warn for the text it exists to carry', async () => {
    const warn = spyWarn();
    render(<VisuallyHidden>(opens in a new tab)</VisuallyHidden>);

    // The guard runs one task after commit, so this has to outlive that task —
    // asserting immediately would pass against a guard that warns about
    // everything.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).not.toHaveBeenCalled();
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<VisuallyHidden>Content</VisuallyHidden>);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium, in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <p>
              Delete <VisuallyHidden>the invoice from March</VisuallyHidden>
            </p>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
