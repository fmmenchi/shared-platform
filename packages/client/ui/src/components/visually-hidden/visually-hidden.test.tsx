import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VisuallyHidden } from './visually-hidden.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const spyWarn = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

// `vi.spyOn` hands back the SAME mock when console.warn is already spied, so
// without this the "does not warn" tests inherit the previous test's calls and
// fail against a guard that is behaving correctly — which is what they did.
afterEach(() => {
  vi.restoreAllMocks();
});

describe('VisuallyHidden', () => {
  it('is off the screen without leaving the accessibility tree', () => {
    render(<VisuallyHidden>3 unread messages</VisuallyHidden>);
    const el = screen.getByText('3 unread messages');
    const style = getComputedStyle(el);

    // THE BOX IS NOT ENOUGH, and assuming it was is how this test first
    // shipped. `getBoundingClientRect` returns the BORDER box, which stays 1×1
    // whether or not the content overflows it — so a hand-written block with
    // the 1px size but no `overflow`/`clip-path` measures identical here while
    // painting the text in full on the page. `app-layout.test.tsx` already
    // pairs the box with the computed style for the same reason.
    const box = el.getBoundingClientRect();
    expect(box.height).toBeLessThan(4);
    expect(box.width).toBeLessThan(4);
    expect(style.clipPath).not.toBe('none');
    expect(style.overflow).toBe('hidden');
    // Named in the CSS comment as a detail that stays wrong for years: without
    // it the text wraps inside the 1px box.
    expect(style.whiteSpace).toBe('nowrap');

    // The opposite mutant, and the one thing this component must never do:
    // `display: none` also measures 0×0 and would take the text OUT of the
    // accessibility tree. Asserted here rather than left to another test.
    expect(style.display).not.toBe('none');
    expect(style.visibility).not.toBe('hidden');
  });

  it('joins the accessible name of the control it is inside', () => {
    // THE COMPONENT'S PRIMARY PURPOSE, and the default `<span>` path — every
    // other a11y-tree assertion in this file goes through `as`. `getByText`
    // reads the DOM and would pass with the text hidden from assistive tech
    // too; only a name computation answers this.
    render(
      <button type="button">
        Delete <VisuallyHidden>the invoice from March</VisuallyHidden>
      </button>,
    );
    expect(
      screen.getByRole('button', { name: 'Delete the invoice from March' }),
    ).toBeInTheDocument();
  });

  it('renders a span by default, and the element `as` asks for', () => {
    const { container, rerender } = render(
      <VisuallyHidden>Content</VisuallyHidden>,
    );
    // Explicit, because the alternative guard is the snapshot — the one test
    // people update reflexively when it goes red.
    expect(container.firstElementChild?.tagName).toBe('SPAN');

    rerender(<VisuallyHidden as="h2">Search results</VisuallyHidden>);

    // The heading is REAL — in the accessibility tree with its name, so a
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

  it('passes the rest of its props, and keeps a caller className', () => {
    // A hidden `role="status"` live region is the second thing this component
    // is reached for, and it is entirely `{...rest}`. Without this, dropping
    // the spread breaks that use and nothing goes red.
    const { container } = render(
      <VisuallyHidden role="status" aria-live="polite" className="mine">
        Saved
      </VisuallyHidden>,
    );
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el).toHaveClass('mine');
    // The component's own class SURVIVES the caller's — a `className` that
    // replaced it would un-hide the text.
    expect(container.firstElementChild?.className).not.toBe('mine');
    expect(el.getBoundingClientRect().height).toBeLessThan(4);
  });

  describe('the guard against hiding something focusable', () => {
    it('warns for a focusable descendant', async () => {
      const warn = spyWarn();
      render(
        <VisuallyHidden>
          <button type="button">Dismiss</button>
        </VisuallyHidden>,
      );

      // The failure axe cannot see: the button is present and named in the
      // accessibility tree, so an axe assertion passes — while a sighted
      // keyboard user tabs onto a control one pixel wide and the focus ring
      // vanishes (WCAG 2.4.7).
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('can be reached with Tab'),
        ),
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('<button>'));
    });

    it('warns when the element ITSELF is the focusable one', async () => {
      const warn = spyWarn();
      // The canonical misuse, and the one the component's own doc names: a
      // skip link written as a hidden anchor. It is caught only by the guard's
      // self-match branch, which nothing else exercises.
      render(
        <VisuallyHidden as="a" href="#main">
          Skip to content
        </VisuallyHidden>,
      );

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('<a>')),
      );
    });

    it('stays quiet for everything Tab cannot actually reach', async () => {
      const warn = spyWarn();
      render(
        <VisuallyHidden>
          <input disabled aria-label="Disabled" />
          <button type="button" tabIndex={-1}>
            Roving idiom
          </button>
          <input type="hidden" value="csrf" readOnly />
          <button type="button" hidden>
            Conditionally rendered
          </button>
          {/* `inert={true}`, not `inert=""` — React 19 treats the empty string
              as false, which made an earlier version of this test render a
              perfectly tabbable button and blame the guard for finding it. */}
          <div inert={true}>
            <button type="button">Behind a modal</button>
          </div>
          <summary>Not inside a details</summary>
        </VisuallyHidden>,
      );

      // EVERY ONE OF THESE WAS A FALSE POSITIVE, measured with real Tab presses
      // against the first version of the guard. `tabindex="-1"` is this
      // package's own roving idiom (Tabs, Menu), `type="hidden"` is routine in
      // a form, and `[inert]` is what a modal does to the page behind it — so
      // the guard was warning about correct code, which is how a guard gets
      // silenced instead of fixed.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns for the tabbable things a tag-name list would miss', async () => {
      const warn = spyWarn();
      render(
        <VisuallyHidden>
          <div contentEditable suppressContentEditableWarning>
            Editable
          </div>
        </VisuallyHidden>,
      );

      // Measured tabbable in Chromium and matched by no tag in the obvious
      // list. Restraint about the candidate set only pays if the deciding is
      // accurate, so the candidates are wide and `isTabbable` does the work.
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('<div>')),
      );
    });

    it('re-checks when the children change', async () => {
      const warn = spyWarn();
      const { rerender } = render(<VisuallyHidden>Loading…</VisuallyHidden>);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warn).not.toHaveBeenCalled();

      // The `[children]` dependency, which is a decision and not an accident:
      // content arriving from a later fetch is exactly when a focusable element
      // appears without anyone editing the call site.
      rerender(
        <VisuallyHidden>
          <a href="/retry">Retry</a>
        </VisuallyHidden>,
      );
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('<a>')),
      );
    });

    it('does not warn for the text it exists to carry', async () => {
      const warn = spyWarn();
      render(<VisuallyHidden>(opens in a new tab)</VisuallyHidden>);

      // The guard runs one task after commit, so this has to outlive that task
      // — asserting immediately would pass against a guard that warns about
      // everything.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<VisuallyHidden>Content</VisuallyHidden>);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium, in each theme. Kept for the package's policy, and
  // worth knowing what it does NOT do: no mutation of this component produces a
  // violation — axe excludes clipped text from contrast, and a control hidden
  // this way is present and correctly named in the tree, which is precisely why
  // the guard above exists.
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
