import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { AppLayout } from './app-layout.component.js';
import { AppLayoutNav } from '../app-layout-nav/app-layout-nav.component.js';
import { useAppLayoutNavForm } from '../app-layout-nav/app-layout-nav.context.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The NARROW form. This project's viewport is 414px — below the `xl` CONTAINER
 * breakpoint — so everything here is the phone: the navigation is a drawer and
 * the column does not exist. The wide form is `app-layout.desktop.test.tsx`,
 * in the project that runs a browser the other media query has something to
 * say to.
 */
const shell = (extra?: React.ReactNode) => (
  <AppLayout>
    <header>
      <strong>Operator panel</strong>
    </header>
    <AppLayoutNav label="Main">
      <Nav label="Main" orientation="vertical">
        <NavLink href="#overview">Overview</NavLink>
        <NavLink href="#settings">Settings</NavLink>
      </Nav>
    </AppLayoutNav>
    <AppLayoutMain>
      <h1>Overview</h1>
    </AppLayoutMain>
    {extra}
    <footer>© 2026</footer>
  </AppLayout>
);

describe('AppLayout', () => {
  it('puts a skip link first, and lands the focus where it points', async () => {
    render(shell());

    // WCAG 2.4.1. The first focusable thing on the page, and the reason the
    // shell owns the `<main>`'s id rather than asking for it.
    await browser.keyboard('{Tab}');
    const skip = document.activeElement as HTMLAnchorElement;
    expect(skip.tagName).toBe('A');
    expect(skip).toHaveTextContent(/skip to content/i);

    const main = screen.getByRole('main');
    expect(skip.getAttribute('href')).toBe(`#${main.id}`);
    // …and VISIBLE once focused — measured as a BOX, not with `toBeVisible`,
    // which only consults `display`/`visibility`/`opacity` and is blind to
    // `sr-only`'s 1×1 clip. Deleting the whole reveal block left that
    // assertion green while the component shipped the exact WCAG failure its
    // own comment says it exists to prevent.
    const shown = skip.getBoundingClientRect();
    expect(shown.height).toBeGreaterThan(20);
    expect(shown.width).toBeGreaterThan(60);
    expect(getComputedStyle(skip).clipPath).toBe('none');

    await browser.keyboard('{Enter}');
    // The focus MOVES, which is the half a skip link usually gets wrong: the
    // browser scrolls but leaves the focus behind, so the next Tab returns the
    // reader to the navigation they just skipped.
    await waitFor(() => expect(document.activeElement).toBe(main));
  });

  it('is out of the way until it is asked for', async () => {
    render(shell());
    const skip = screen.getByRole('link', { name: /skip to content/i });

    // The mirror of the assertion above, and the mutant it kills: making
    // `.skip` merely `position: absolute` puts a permanent "Skip to content"
    // on every page of every consumer, and nothing noticed.
    const hidden = skip.getBoundingClientRect();
    expect(hidden.height).toBeLessThan(4);
    expect(getComputedStyle(skip).clipPath).not.toBe('none');
  });

  it('says which form it is in, for the content that differs', () => {
    function Form() {
      return <span data-testid="form">{useAppLayoutNavForm() ?? 'none'}</span>;
    }
    render(
      <AppLayout>
        <AppLayoutNav label="Main">
          <Nav label="Main" orientation="vertical">
            <NavLink href="#a">A</NavLink>
          </Nav>
          <Form />
        </AppLayoutNav>
        <AppLayoutMain>Body</AppLayoutMain>
      </AppLayout>,
    );

    // The shell swaps the CONTAINER; what goes in it is the product's, and a
    // rail and a drawer are rarely identical — a rail collapses to icons, a
    // drawer carries a brand the header already shows. So the shell says which
    // one is up rather than deciding they are the same thing.
    expect(screen.getByTestId('form')).toHaveTextContent('drawer');
    expect(document.querySelector('[data-region="nav"]')).toHaveAttribute(
      'data-form',
      'drawer',
    );
  });

  it('stacks its regions in reading order', () => {
    render(
      shell(
        <aside>
          <p>Related</p>
        </aside>,
      ),
    );
    const trigger = screen.getByRole('button', { name: /menu/i });
    const header = screen.getByRole('banner');
    const main = screen.getByRole('main');
    const aside = screen.getByRole('complementary');
    const footer = screen.getByRole('contentinfo');
    const box = (el: Element) => el.getBoundingClientRect();

    // The narrow template had NO `aside` area, so a documented region was
    // auto-placed into an implicit column below the footer and shrank every
    // other region from 414px to 333. Nothing failed — this file made no
    // geometric assertion at all.
    expect(Math.round(box(header).top)).toBe(Math.round(box(trigger).top));
    expect(box(main).top).toBeGreaterThanOrEqual(box(header).bottom - 1);
    expect(box(aside).top).toBeGreaterThanOrEqual(box(main).bottom - 1);
    expect(box(footer).top).toBeGreaterThanOrEqual(box(aside).bottom - 1);
    for (const region of [header, main, aside, footer]) {
      expect(box(region).right).toBeLessThanOrEqual(window.innerWidth);
    }
    expect(Math.round(box(main).width)).toBe(window.innerWidth);
  });

  it('never exposes two navigations, whichever form is showing', async () => {
    render(shell());

    // NONE while the drawer is shut, which is the honest answer on a phone: the
    // navigation is not on the page, it is behind a button. The column copy is
    // `display: none` — not merely invisible — so it leaves the accessibility
    // tree instead of lingering as a second landmark by the same name.
    expect(screen.queryAllByRole('navigation')).toHaveLength(0);

    await browser.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() =>
      expect(screen.queryAllByRole('navigation')).toHaveLength(1),
    );

    // ONE, not two — which is the whole risk of rendering both forms rather
    // than choosing between them in JavaScript.
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  it('is a drawer on a narrow screen, not a column', async () => {
    render(shell());

    const trigger = screen.getByRole('button', { name: /menu/i });
    expect(trigger).toBeVisible();
    await browser.click(trigger);

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(dialog.matches(':modal')).toBe(true);
    expect(dialog).toHaveAccessibleName('Main');
    // The navigation the reader came for is inside it, and it is still the only
    // one exposed.
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(dialog.contains(screen.getByRole('navigation'))).toBe(true);
  });

  it('has one main, one banner and one contentinfo', () => {
    render(shell());
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  describe('accessibility (axe)', () => {
    it('has no violations', async () => {
      const { container } = renderUi(shell());
      await expectNoA11yViolations(container);
    });
  });
});
