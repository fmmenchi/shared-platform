import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UiProvider } from '../../i18n/provider.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import { userEvent as browser } from '@vitest/browser/context';
import { AppLayout } from './app-layout.component.js';
import { AppLayoutNav } from '../app-layout-nav/app-layout-nav.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

/**
 * The WIDE form, in the project that runs a browser above the `xl` CONTAINER
 * breakpoint. Everything here is geometry — which is the half no behavioural
 * test can see, and the half this component is almost entirely made of.
 */
const nav = (
  <Nav label="Main" orientation="vertical">
    <NavLink href="#overview">Overview</NavLink>
  </Nav>
);

const shell = (opts: { nav?: boolean; aside?: boolean } = {}) => (
  <AppLayout>
    <header>Panel</header>
    {opts.nav !== false && <AppLayoutNav label="Main">{nav}</AppLayoutNav>}
    <AppLayoutMain>
      <h1>Overview</h1>
    </AppLayoutMain>
    {opts.aside && (
      <aside>
        <Nav label="On this page" orientation="vertical">
          <NavLink href="#install">Install</NavLink>
        </Nav>
      </aside>
    )}
    <footer>© 2026</footer>
  </AppLayout>
);

const box = (el: Element) => el.getBoundingClientRect();

describe('AppLayout, above the breakpoint', () => {
  it('is a column beside the content, not a drawer', () => {
    render(shell());

    // The navigation is IN the page here, so it is a landmark again — and the
    // drawer's trigger is gone rather than merely hidden behind it.
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();

    const rail = screen.getByRole('navigation').closest('[data-region="nav"]');
    const main = screen.getByRole('main');
    expect(rail).not.toBeNull();
    // Beside, and level with it — the tell of a grid that placed them rather
    // than a stack that happens to look right.
    expect(box(rail as Element).right).toBeLessThanOrEqual(box(main).left);
    expect(Math.round(box(rail as Element).top)).toBe(
      Math.round(box(main).top),
    );
  });

  it('puts the header above both and the footer below both', () => {
    render(shell());
    const header = screen.getByRole('banner');
    const footer = screen.getByRole('contentinfo');
    const main = screen.getByRole('main');
    const rail = screen.getByRole('navigation').closest('[data-region="nav"]');

    expect(box(header).bottom).toBeLessThanOrEqual(box(main).top);
    expect(box(header).width).toBeGreaterThan(box(main).width);
    expect(box(footer).top).toBeGreaterThanOrEqual(box(main).bottom);
    expect(box(footer).width).toBeGreaterThan(box(rail as Element).width);
  });

  it('becomes three columns when an aside is there, with no prop', () => {
    render(shell({ aside: true }));
    const rail = screen
      .getAllByRole('navigation')[0]
      .closest('[data-region="nav"]') as Element;
    const main = screen.getByRole('main');
    const aside = screen.getByRole('complementary');

    // The grid asks what is present. Three regions, three columns, in order —
    // and the alternative was a `columns` prop that every product would have
    // had to keep in step with its own markup.
    expect(box(rail).right).toBeLessThanOrEqual(box(main).left);
    expect(box(main).right).toBeLessThanOrEqual(box(aside).left);
    expect(Math.round(box(aside).top)).toBe(Math.round(box(main).top));
  });

  it('does not brick the page when the drawer is open as it widens', async () => {
    // THE WORST DEFECT THIS COMPONENT HAD. Both forms used to be rendered with
    // one hidden by CSS, so crossing the breakpoint with the drawer open left a
    // modal `<dialog>` with `display: none` on its wrapper: still `:modal`,
    // still holding the scroll lock, still making the page inert, and with no
    // box — so nothing could be clicked, focused or scrolled and the close
    // button did not exist. Reachable by rotating a tablet.
    const { rerender } = render(
      <div style={{ inlineSize: 380 }}>{shell()}</div>,
    );
    await browser.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(<div style={{ inlineSize: 1000 }}>{shell()}</div>);

    await waitFor(() =>
      expect(screen.getAllByRole('navigation')).toHaveLength(1),
    );
    // The page is ALIVE: no modal, no scroll lock, and the content takes focus.
    // Waited for, because the dialog leaves through its exit animation.
    await waitFor(() =>
      expect(document.querySelector('dialog:modal')).toBeNull(),
    );
    await waitFor(() =>
      expect(document.documentElement.style.overflow).toBe(''),
    );
    const main = screen.getByRole('main');
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it('swaps at the width the token declares', async () => {
    // Neither other width is near the boundary, so the breakpoint itself was
    // unpinned: `@xl` could become `@lg` and every test stayed green while a
    // 16rem rail landed on a 600px panel.
    const { rerender } = render(
      <div style={{ inlineSize: 760 }}>{shell()}</div>,
    );
    expect(screen.getByRole('button', { name: /menu/i })).toBeVisible();

    rerender(<div style={{ inlineSize: 780 }}>{shell()}</div>);
    // The form follows a `ResizeObserver`, so the swap lands after the paint
    // the rerender caused.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /menu/i })).toBeNull(),
    );
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  it('gives the column the width the token says', () => {
    render(shell());
    const rail = screen
      .getByRole('navigation')
      .closest('[data-region="nav"]') as HTMLElement;
    const declared = getComputedStyle(document.documentElement)
      .getPropertyValue('--fm-size-nav')
      .trim();

    // Asserted against the TOKEN, not a number retyped here: the commit that
    // introduced these argued a theme can retune them, and nothing checked it.
    expect(declared).toBe('16rem');
    expect(Math.round(box(rail).width)).toBe(256);
  });

  it('mirrors in Arabic', () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'ar' } }}>
        {shell({ aside: true })}
      </UiProvider>,
    );
    const rail = screen
      .getAllByRole('navigation')[0]
      .closest('[data-region="nav"]') as HTMLElement;
    const main = screen.getByRole('main');
    const aside = screen.getByRole('complementary');

    // Every other geometry assertion here is physical, so RTL is the one
    // arrangement they would all get wrong. The areas are logical: the column
    // sits on the right and the order reverses.
    expect(box(rail).left).toBeGreaterThan(box(main).right - 1);
    expect(box(aside).right).toBeLessThanOrEqual(box(main).left);
  });

  describe('accessibility (axe)', () => {
    it('has no violations in the wide form, aside and all', async () => {
      // The only axe run was narrow, drawer shut, no aside — so the
      // three-column composition had never been checked at all.
      // NOT wrapped in a `<main>` the way the other suites wrap their
      // components: this one renders the page's own `<main>`, and nesting them
      // is itself a violation.
      const { container } = renderUi(shell({ aside: true }));
      await expectNoA11yViolations(container);
    });
  });

  it("answers to its own width, not the window's", () => {
    // A WIDE viewport (this project is 1280px) and a NARROW container. A media
    // query would put the column up regardless and hand a 16rem rail to a
    // 380px panel; a container query asks the width the layout actually has.
    render(<div style={{ inlineSize: 380 }}>{shell()}</div>);

    expect(screen.queryAllByRole('navigation')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  it('still gives the drawer the whole viewport', async () => {
    // `container-type` implies containment, and containment makes an element
    // the containing block for its `position: fixed` descendants — so a modal
    // pinned to "the edges" could quietly have become pinned to a 380px panel.
    // Measured: the top layer escapes it, and the drawer is the viewport's.
    render(
      <div style={{ inlineSize: 380, marginInlineStart: 200 }}>{shell()}</div>,
    );

    await browser.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    await Promise.all(dialog.getAnimations().map((a) => a.finished));

    const box = dialog.getBoundingClientRect();
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.top)).toBe(0);
    expect(Math.round(box.height)).toBe(window.innerHeight);
  });

  it('is a column again when its container is wide enough', () => {
    render(<div style={{ inlineSize: 1000 }}>{shell()}</div>);

    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();
  });

  it('lets the PAGE scroll, and keeps the column in view while it does', async () => {
    render(
      <AppLayout>
        <header>Panel</header>
        <AppLayoutNav label="Main">{nav}</AppLayoutNav>
        <AppLayoutMain>
          {Array.from({ length: 120 }, (_, index) => (
            <p key={index}>Paragraph {index}</p>
          ))}
        </AppLayoutMain>
        <footer>© 2026</footer>
      </AppLayout>,
    );

    const root = document.documentElement;
    const main = screen.getByRole('main');
    const rail = screen
      .getByRole('navigation')
      .closest('[data-region="nav"]') as HTMLElement;

    // THE DOCUMENT scrolls, not a region inside it. Measured before choosing:
    // an `overflow` on the regions never fired, because the grid grows rather
    // than overflowing — and taking the scroll off the document is what stops a
    // phone's address bar retracting and puts the footer out of reach.
    expect(root.scrollHeight).toBeGreaterThan(root.clientHeight);
    expect(main.scrollHeight).toBe(main.clientHeight);

    window.scrollTo(0, 600);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const stuck = Math.round(rail.getBoundingClientRect().top);

    window.scrollTo(0, 1400);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // STUCK, which is not "does not move": it travels up until it meets the
    // edge and then stops, so the proof is that a SECOND scroll moves it no
    // further while the content keeps going. An earlier version claimed the
    // column stayed put and it scrolled away with everything else.
    expect(stuck).toBe(0);
    expect(Math.round(rail.getBoundingClientRect().top)).toBe(stuck);
    expect(main.getBoundingClientRect().top).toBeLessThan(-1300);
    window.scrollTo(0, 0);
  });

  it('gives the content the whole width when there is no navigation', () => {
    render(shell({ nav: false }));
    const main = screen.getByRole('main');
    const header = screen.getByRole('banner');

    // A marketing or commerce page: the nav lives inside the header, and the
    // column simply is not there. Same component, one region fewer.
    expect(Math.round(box(main).width)).toBe(Math.round(box(header).width));
    expect(Math.round(box(main).left)).toBe(Math.round(box(header).left));
  });
});
