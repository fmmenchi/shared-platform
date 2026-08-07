import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Nav } from './nav.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (orientation?: 'horizontal' | 'vertical') => (
  <Nav label="Main" orientation={orientation}>
    <NavLink href="/">Home</NavLink>
    <NavGroup label="Products">
      <NavLink href="/tea">Tea</NavLink>
      <NavLink href="/coffee">Coffee</NavLink>
    </NavGroup>
    <NavGroup label="About">
      <NavLink href="/team">Team</NavLink>
    </NavGroup>
    <NavLink href="/contact">Contact</NavLink>
  </Nav>
);

const group = (name: string) => screen.getByRole('button', { name });
const link = (name: string) => screen.getByRole('link', { name });

describe('Nav', () => {
  it('is a named landmark holding a list of links', () => {
    render(example());
    const nav = screen.getByRole('navigation', { name: 'Main' });
    // A list is what a screen reader counts — "list, 4 items" — and what the
    // W3C navigation tutorial marks up.
    expect(nav.querySelector('ul')).not.toBeNull();
    // And nothing here is a menu: a set of links announced as a set of commands
    // is the mistake this whole family exists to avoid.
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('says whether a group is open, and what it controls', async () => {
    render(example());
    const products = group('Products');
    expect(products).toHaveAttribute('aria-expanded', 'false');

    const listId = products.getAttribute('aria-controls');
    expect(listId).toBeTruthy();
    // Rendered while closed, or `aria-controls` would point at nothing and the
    // button would announce a relationship it does not have.
    expect(document.getElementById(listId as string)).not.toBeNull();

    await browser.click(products);
    await waitFor(() =>
      expect(products).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(link('Tea')).toBeVisible();
  });

  it('lets Tab walk the links, which is the whole difference', async () => {
    render(example());
    await browser.click(group('Products'));
    await waitFor(() => expect(link('Tea')).toBeVisible());

    // A menu is ONE tab stop and Tab leaves it. This is not a menu: the
    // browser's own order is already right, and the links are in it.
    group('Products').focus();
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(link('Tea'));
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(link('Coffee'));
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(group('About'));
  });

  it('closes a group with Escape and hands the focus back', async () => {
    render(example());
    await browser.click(group('Products'));
    await waitFor(() => expect(link('Tea')).toBeVisible());

    link('Tea').focus();
    await browser.keyboard('{Escape}');
    // "Closes it and sets focus on the button that controls that dropdown"
    // (APG). The focus was inside the list, so nothing else would bring it back.
    await waitFor(() =>
      expect(group('Products')).toHaveAttribute('aria-expanded', 'false'),
    );
    expect(document.activeElement).toBe(group('Products'));
  });

  it('keeps one flyout at a time on a bar', async () => {
    render(example('horizontal'));
    await browser.click(group('Products'));
    await waitFor(() =>
      expect(group('Products')).toHaveAttribute('aria-expanded', 'true'),
    );

    // Two panels open over the page at once is two answers to "where am I".
    await browser.click(group('About'));
    await waitFor(() =>
      expect(group('About')).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(group('Products')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps every section the reader opened in a sidebar', async () => {
    render(example('vertical'));
    await browser.click(group('Products'));
    await browser.click(group('About'));

    // A sidebar that shuts one section to open another loses the place the
    // reader was keeping. Nothing about a tree says the levels are exclusive.
    await waitFor(() =>
      expect(group('About')).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(group('Products')).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes a flyout when the focus leaves, and a sidebar never', async () => {
    const { rerender } = render(
      <>
        {example('horizontal')}
        <button type="button">Elsewhere</button>
      </>,
    );
    await browser.click(group('Products'));
    await waitFor(() =>
      expect(group('Products')).toHaveAttribute('aria-expanded', 'true'),
    );

    // "Moving focus out of the navigation region also closes an open dropdown"
    // (APG) — a panel floating over the page after the reader has left it.
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    await waitFor(() =>
      expect(group('Products')).toHaveAttribute('aria-expanded', 'false'),
    );

    rerender(
      <>
        {example('vertical')}
        <button type="button">Elsewhere</button>
      </>,
    );
    await browser.click(group('Products'));
    await waitFor(() =>
      expect(group('Products')).toHaveAttribute('aria-expanded', 'true'),
    );
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(group('Products')).toHaveAttribute('aria-expanded', 'true');
  });

  it('says where the reader already is, and not with colour alone', () => {
    render(
      <Nav label="Main">
        <NavLink href="/" current>
          Home
        </NavLink>
        <NavLink href="/contact">Contact</NavLink>
      </Nav>,
    );
    expect(link('Home')).toHaveAttribute('aria-current', 'page');
    expect(link('Contact')).not.toHaveAttribute('aria-current');
  });

  it('takes the router from the provider, once', () => {
    const RouterLink = (p: { href: string; children?: React.ReactNode }) => (
      <a href={p.href} data-router="">
        {p.children}
      </a>
    );
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, Link: RouterLink }}>
        <Nav label="Main">
          <NavLink href="/tea">Tea</NavLink>
          <NavLink href="https://example.com" as="a">
            Elsewhere
          </NavLink>
        </Nav>
      </UiProvider>,
    );

    // The adapter the design system already declared, put to work: injected
    // once, and no call site repeats it.
    expect(link('Tea')).toHaveAttribute('data-router');
    // …and `as` is the exception, for a destination that must not go through
    // the router at all.
    expect(link('Elsewhere')).not.toHaveAttribute('data-router');
  });

  it('is a plain anchor with no router in scope', () => {
    render(
      <Nav label="Main">
        <NavLink href="/tea">Tea</NavLink>
      </Nav>,
    );
    expect(link('Tea').tagName).toBe('A');
  });

  describe('accessibility (axe)', () => {
    it('has no violations with a group open', async () => {
      const { container } = renderUi(<main>{example()}</main>);
      await browser.click(group('Products'));
      await waitFor(() => expect(link('Tea')).toBeVisible());
      await expectNoA11yViolations(container);
    });
  });
});
