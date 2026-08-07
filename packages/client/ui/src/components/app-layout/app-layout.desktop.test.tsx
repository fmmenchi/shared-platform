import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from './app-layout.component.js';
import { AppLayoutNav } from '../app-layout-nav/app-layout-nav.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

/**
 * The WIDE form, in the project that runs a browser above the `tablet`
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
