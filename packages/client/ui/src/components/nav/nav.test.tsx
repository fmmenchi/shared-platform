import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Nav } from './nav.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * Fragment hrefs throughout: a real path navigates the test iframe away and the
 * runner loses its connection to it — and several of these tests have to CLICK
 * a link, because "what happens after the reader picks a destination" is one of
 * the things this family gets wrong when nobody looks.
 */
const example = (orientation?: 'horizontal' | 'vertical') => (
  <Nav label="Main" orientation={orientation}>
    <NavLink href="#home">Home</NavLink>
    <NavGroup label="Products">
      <NavLink href="#tea">Tea</NavLink>
      <NavLink href="#coffee">Coffee</NavLink>
    </NavGroup>
    <NavGroup label="About">
      <NavLink href="#team">Team</NavLink>
    </NavGroup>
    <NavLink href="#contact">Contact</NavLink>
  </Nav>
);

const group = (name: string) => screen.getByRole('button', { name });
const link = (name: string) => screen.getByRole('link', { name });
const listOf = (name: string) =>
  document.getElementById(group(name).getAttribute('aria-controls') as string)!;

const opened = async (name: string) => {
  await waitFor(() =>
    expect(group(name)).toHaveAttribute('aria-expanded', 'true'),
  );
  // ARRIVED, not merely open: the flyout fades in, so anything asked on the
  // frame it opens is asked of a box still at `opacity: 0` — which is not
  // "visible" to a test, or to a reader.
  await Promise.all(
    listOf(name)
      .getAnimations()
      .map((a) => a.finished),
  );
};
const closed = (name: string) =>
  waitFor(() => expect(group(name)).toHaveAttribute('aria-expanded', 'false'));

describe('Nav', () => {
  it('is a named landmark holding a counted list of links', () => {
    render(example());
    const nav = screen.getByRole('navigation', { name: 'Main' });

    // The ROLE, not the tag: "list, 4 items" is what a screen reader announces
    // and what the W3C navigation tutorial marks up, and `querySelector('ul')`
    // — which this test used to do — is satisfied by a `<ul>` full of `<div>`s.
    // Four items in the bar itself — two links and two groups — and the two
    // groups' own lists, which are hidden until they are opened.
    expect(within(nav).getAllByRole('list')).toHaveLength(1);
    expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
    expect(within(nav).getAllByRole('list', { hidden: true })).toHaveLength(3);
    expect(within(nav).getAllByRole('link', { hidden: true })).toHaveLength(5);
  });

  it('has no menu roles anywhere, open or closed', async () => {
    render(example());
    // `{ hidden: true }` and with a group OPEN, because the queries skip hidden
    // subtrees: the closed-only version of this assertion could not see inside
    // the one place a `menuitem` would plausibly be added.
    expect(screen.queryAllByRole('menu', { hidden: true })).toHaveLength(0);
    expect(screen.queryAllByRole('menuitem', { hidden: true })).toHaveLength(0);

    await browser.click(group('Products'));
    await opened('Products');
    expect(screen.queryAllByRole('menu', { hidden: true })).toHaveLength(0);
    expect(screen.queryAllByRole('menuitem', { hidden: true })).toHaveLength(0);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('says whether a group is open, and what it controls', async () => {
    render(example());
    const products = group('Products');
    expect(products).toHaveAttribute('aria-expanded', 'false');

    const listId = products.getAttribute('aria-controls');
    expect(listId).toBeTruthy();
    // Rendered while closed, or `aria-controls` would point at nothing and the
    // button would announce a relationship it does not have — AND actually
    // hidden while closed, which is the half a disclosure exists for.
    const list = document.getElementById(listId as string);
    expect(list).not.toBeNull();
    expect(list).not.toBeVisible();
    expect(screen.queryByRole('link', { name: 'Tea' })).toBeNull();

    await browser.click(products);
    await opened('Products');
    expect(link('Tea')).toBeVisible();
  });

  it('closes again when the button is pressed a second time', async () => {
    render(example());
    await browser.click(group('Products'));
    await opened('Products');

    // The other direction of the verb. Only ever opened, a `toggle` that had
    // quietly become open-only would pass every other test in this file.
    await browser.click(group('Products'));
    await closed('Products');
    expect(screen.queryByRole('link', { name: 'Tea' })).toBeNull();
  });

  it('opens from the keyboard, with the button being a button', async () => {
    render(example());
    group('Products').focus();
    await browser.keyboard('{Enter}');
    await opened('Products');

    await browser.keyboard('{Escape}');
    await closed('Products');

    group('Products').focus();
    await browser.keyboard(' ');
    await opened('Products');
  });

  it('lets Tab walk the links, which is the whole difference', async () => {
    render(example());
    await browser.click(group('Products'));
    await opened('Products');

    // A menu is ONE tab stop and Tab leaves it. This is not a menu: the
    // browser's own order is already right, and the links are in it — which
    // holds even though the open flyout is in the TOP LAYER, because that
    // changes what paints over what and not where the element is in the tree.
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
    await opened('Products');

    link('Tea').focus();
    await browser.keyboard('{Escape}');
    // "Closes it and sets focus on the button that controls that dropdown"
    // (APG) — done by the platform for a top-level popover, which is why there
    // is no handler of ours here to test.
    await closed('Products');
    expect(document.activeElement).toBe(group('Products'));
  });

  it('closes on Escape even when the focus never entered it', async () => {
    render(example());
    // The click that does NOT focus its button, which is what Safari and
    // Firefox do on macOS. A React `onKeyDown` scoped to the group's own
    // subtree cannot hear a keydown whose target is `<body>`; the platform can.
    group('Products').click();
    await opened('Products');
    (document.activeElement as HTMLElement | null)?.blur();

    await browser.keyboard('{Escape}');
    await closed('Products');
  });

  it('closes a flyout on a click outside, with the focus nowhere near it', async () => {
    render(
      <>
        {example('horizontal')}
        {/* Out of the flyout's way: an open panel paints over the page, and a
            click the surface intercepts is not a click OUTSIDE it. */}
        <p data-testid="page" style={{ position: 'fixed', bottom: 0, left: 0 }}>
          Somewhere else on the page
        </p>
      </>,
    );
    group('Products').click();
    await opened('Products');

    // The defect this form exists to fix: with focus still on `<body>`, a
    // focus-out handler never runs and the panel could not be dismissed at all.
    await browser.click(screen.getByTestId('page'));
    await closed('Products');
  });

  it('closes the flyout when a destination is chosen', async () => {
    render(example('horizontal'));
    await browser.click(group('Products'));
    await opened('Products');

    // A click INSIDE a popover is not a light dismiss, and with the router
    // arriving through the `Link` port the page does not unload either — so
    // nothing else would take the panel off the page it just navigated to.
    await browser.click(link('Tea'));
    await closed('Products');
  });

  it('keeps one flyout at a time on a bar', async () => {
    render(example('horizontal'));
    await browser.click(group('Products'));
    await opened('Products');

    // Two panels open over the page at once is two answers to "where am I" —
    // and it is the platform that keeps this rule, not a record of ours.
    await browser.click(group('About'));
    await opened('About');
    await closed('Products');
  });

  it('is a bar unless it is told otherwise', async () => {
    render(example());
    // The default decides which of the two forms a consumer gets, and every
    // other test that omits the prop passes under either.
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'data-orientation',
      'horizontal',
    );
    // Opened by the PLATFORM, and nothing of ours may be writing `display` on
    // it: measured, `hidden` beats `:popover-open` — the popover reports open
    // and computes to `display: none`. Asserted on the frame the click lands,
    // before React has re-rendered, because that is exactly the window in which
    // a mirrored `hidden` would still be saying "closed" over an open surface.
    group('Products').click();
    expect(listOf('Products').matches(':popover-open')).toBe(true);
    expect(getComputedStyle(listOf('Products')).display).not.toBe('none');
    await opened('Products');
  });

  it('draws each form as the kind of box it is', async () => {
    const { rerender } = render(example('horizontal'));
    await browser.click(group('Products'));
    await opened('Products');

    // The attribute the two stylesheets are keyed off. Asserted through what it
    // PRODUCES: a flyout is a surface over the page, positioned by the geometry
    // against the viewport, and an open one is not left parked off-screen.
    const flyout = listOf('Products');
    expect(getComputedStyle(flyout).position).toBe('fixed');
    expect(flyout.getBoundingClientRect().top).toBeGreaterThan(0);
    expect(flyout.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );

    rerender(example('vertical'));
    await browser.click(group('Products'));
    await opened('Products');
    // A sidebar section is part of the page: in flow, indented, not a surface.
    const section = listOf('Products');
    expect(getComputedStyle(section).position).toBe('static');
    expect(section.matches(':popover-open')).toBe(false);
    expect(
      parseFloat(getComputedStyle(section).paddingInlineStart),
    ).toBeGreaterThan(0);
  });

  it('keeps every section the reader opened in a sidebar', async () => {
    render(
      <>
        {example('vertical')}
        <p data-testid="page" style={{ position: 'fixed', bottom: 0, left: 0 }}>
          Somewhere else on the page
        </p>
      </>,
    );
    await browser.click(group('Products'));
    await browser.click(group('About'));

    // A sidebar that shuts one section to open another loses the place the
    // reader was keeping. Nothing about a tree says the levels are exclusive.
    await opened('About');
    await opened('Products');

    // Hidden while closed and not while open, which is the half of a disclosure
    // that can break without anything else looking different: `aria-expanded`
    // would go on saying "collapsed" over a list the reader can see and Tab can
    // walk. The flyout form is hidden by BEING a closed popover; this one is
    // hidden by the attribute, and only this one.
    expect(listOf('Products')).toBeVisible();
    await browser.click(group('Products'));
    await closed('Products');
    expect(listOf('Products')).not.toBeVisible();
    expect(listOf('Products')).toHaveAttribute('hidden');
    // …and the button opens it again, rather than being a one-way switch.
    await browser.click(group('Products'));
    await opened('Products');

    // Nor is it transient: it survives a click elsewhere on the page, and it
    // does not take `Escape` off whatever the page has put it inside.
    await browser.click(screen.getByTestId('page'));
    await browser.keyboard('{Escape}');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(group('Products')).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a nested group without closing the one it is inside', async () => {
    render(
      <Nav label="Main" orientation="vertical">
        <NavGroup label="Docs">
          <NavLink href="#intro">Intro</NavLink>
          <NavGroup label="Guides">
            <NavLink href="#first">First steps</NavLink>
          </NavGroup>
        </NavGroup>
      </Nav>,
    );
    await browser.click(group('Docs'));
    await opened('Docs');
    await browser.click(group('Guides'));
    await opened('Guides');

    // A tree is the reason the sidebar form exists. Closing the parent to open
    // the child would take the child off the screen with it.
    expect(group('Docs')).toHaveAttribute('aria-expanded', 'true');
    expect(link('First steps')).toBeVisible();
  });

  it('leaves the consumer their own button', async () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Nav label="Main">
        <NavGroup
          label="Products"
          onClick={onClick}
          onKeyDown={onKeyDown}
          ref={ref}
          data-testid="products"
        >
          <NavLink href="#tea">Tea</NavLink>
        </NavGroup>
      </Nav>,
    );

    expect(ref.current).toBe(group('Products'));
    expect(group('Products')).toHaveAttribute('data-testid', 'products');

    await browser.click(group('Products'));
    expect(onClick).toHaveBeenCalled();
    await browser.keyboard('{Escape}');
    // `onKeyDown` typechecked and autocompleted while being destructured out
    // and never re-attached — a prop that existed only in the editor.
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('does not submit the form it may be sitting in', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Nav label="Filters" orientation="vertical">
          <NavGroup label="Products">
            <NavLink href="#tea">Tea</NavLink>
          </NavGroup>
        </Nav>
      </form>,
    );
    await browser.click(group('Products'));
    await opened('Products');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says where the reader already is, and not with colour alone', () => {
    render(
      <Nav label="Main" orientation="vertical">
        <NavLink href="#home" current>
          Home
        </NavLink>
        <NavLink href="#docs" current="location">
          Docs
        </NavLink>
        <NavLink href="#help" aria-current="step">
          Help
        </NavLink>
        <NavLink href="#contact">Contact</NavLink>
      </Nav>,
    );
    expect(link('Home')).toHaveAttribute('aria-current', 'page');
    // The SECTION the reader is inside is not the page they are on, and it is
    // the common case in a navigation: seven values exist and this prop used to
    // express one of them.
    expect(link('Docs')).toHaveAttribute('aria-current', 'location');
    // Written directly, it must survive — an `undefined` from the prop used to
    // delete it after the spread, making the escape hatch unreachable.
    expect(link('Help')).toHaveAttribute('aria-current', 'step');
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
          <NavLink href="#tea">Tea</NavLink>
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
        <NavLink href="#tea">Tea</NavLink>
      </Nav>,
    );
    // Not `tagName === 'A'`, which the injected component above also satisfies:
    // what says the port was not used is the mark that component leaves.
    expect(link('Tea')).not.toHaveAttribute('data-router');
    expect(link('Tea').tagName).toBe('A');
  });

  it('says which group the reader has walked into', async () => {
    render(example());
    await browser.click(group('Products'));
    await opened('Products');

    // `aria-controls` is the relationship the pattern asks for, and nearly
    // every screen reader ignores it for navigation — so without a name of its
    // own the panel announced "list, 2 items" and nothing about which group.
    const list = listOf('Products');
    expect(list).toHaveAccessibleName('Products');
    expect(list.getAttribute('aria-labelledby')).toBe(group('Products').id);
  });

  it('keeps two navigations on a page apart', async () => {
    render(
      <>
        {example('vertical')}
        <Nav label="In this section" orientation="vertical">
          <NavGroup label="Products">
            <NavLink href="#pricing">Pricing</NavLink>
          </NavGroup>
        </Nav>
      </>,
    );
    // Which is why `label` is required: two landmarks both called "navigation"
    // is a list of entries a screen reader user cannot tell apart.
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'In this section' }),
    ).toBeInTheDocument();

    // Two groups sharing a LABEL still have their own ids and their own state:
    // opening one leaves the other closed, and each button controls its own.
    const [first, second] = screen.getAllByRole('button', { name: 'Products' });
    expect(first.getAttribute('aria-controls')).not.toBe(
      second.getAttribute('aria-controls'),
    );
    await browser.click(second);
    await waitFor(() =>
      expect(second).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('takes the flyout away when its button goes', async () => {
    // The SAME tree either way, so React keeps the same nodes and only the
    // style changes: a rerender that alters the shape unmounts the group, and
    // the popover then goes because its element went — which is how the first
    // version of this test passed while proving nothing.
    const collapsing = (hidden?: boolean) => (
      <Nav label="Main" orientation="horizontal">
        <NavGroup
          label="Products"
          style={hidden ? { display: 'none' } : undefined}
        >
          <NavLink href="#tea">Tea</NavLink>
        </NavGroup>
      </Nav>
    );
    const { rerender } = render(collapsing());
    await browser.click(group('Products'));
    await opened('Products');
    const list = listOf('Products');

    // A surface anchored to nothing: the bar collapsing at a breakpoint, the
    // group hidden under it. The geometry reports it and the component closes —
    // nothing else would, because a popover has no opinion about whether its
    // anchor still exists, and no pointer or key was involved to dismiss it.
    rerender(collapsing(true));
    await waitFor(() => expect(list.matches(':popover-open')).toBe(false));
  });

  it('opens toward the reading direction', async () => {
    render(
      <div dir="rtl" style={{ position: 'absolute', insetInlineStart: 0 }}>
        {example('horizontal')}
      </div>,
    );
    await browser.click(group('Products'));
    await opened('Products');

    // `bottom-start` is a LOGICAL edge: in Arabic or Hebrew the flyout hangs
    // from the right of its button, not the left.
    const flyout = listOf('Products').getBoundingClientRect();
    const button = group('Products').getBoundingClientRect();
    expect(Math.round(flyout.right)).toBe(Math.round(button.right));
  });

  describe('accessibility (axe)', () => {
    it('has no violations with a group open', async () => {
      const { container } = renderUi(
        <main>
          <Nav label="Main">
            <NavLink href="#home" current>
              Home
            </NavLink>
            <NavGroup label="Products">
              <NavLink href="#tea">Tea</NavLink>
            </NavGroup>
          </Nav>
        </main>,
      );
      await browser.click(group('Products'));
      await opened('Products');
      await expectNoA11yViolations(container);
    });

    it('has no violations as a sidebar', async () => {
      const { container } = renderUi(<main>{example('vertical')}</main>);
      await browser.click(group('Products'));
      await opened('Products');
      await expectNoA11yViolations(container);
    });
  });
});
