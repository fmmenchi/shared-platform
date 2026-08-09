import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { ReactRouterScreen } from './react-router.screen.js';
import { TanstackRouterScreen } from './tanstack-router.screen.js';
import type { RouterScreenProps } from './router.shared.js';

/**
 * ONE suite, every router.
 *
 * Same shape as the form ports and for the same reason: this is not a test that
 * each binding works, it is a test that the SAME assertions hold for all of
 * them. An assertion that had to say "except for TanStack" would be the port
 * leaking, and the leak is the thing worth catching — a design system whose
 * navigation behaves differently per router has not abstracted the router, it
 * has only hidden it.
 *
 * Written against `aria-current`, because that is what the port exists to get
 * right: it is what a screen reader announces, and what the highlight is keyed
 * on. The colour is downstream of it, never the other way round.
 */
const SCREENS: Array<[string, ComponentType<RouterScreenProps>]> = [
  ['React Router', ReactRouterScreen],
  ['TanStack Router', TanstackRouterScreen],
];

const link = (name: string) => screen.getByRole('link', { name });
const current = (name: string) => link(name).getAttribute('aria-current');

describe.each(SCREENS)('%s through the port', (_name, Screen) => {
  const at = async (path: string, basename?: string) => {
    render(<Screen at={path} basename={basename} />);
    // Wait for the ROUTE, not for the menu. The menu renders immediately on
    // both engines while TanStack resolves its first match asynchronously, so
    // waiting for the list read `aria-current` before the router had answered
    // — green on React Router, and wrong on TanStack, which is exactly the
    // shape of a bug this shared suite exists to refuse.
    await waitFor(() =>
      expect(screen.getByTestId('resolved')).toHaveTextContent(path),
    );
  };

  it('marks the page the reader is on, and only it', async () => {
    await at('/pricing');
    expect(current('Pricing')).toBe('page');
    expect(current('Settings')).toBe(null);
    expect(current('Profile')).toBe(null);
  });

  it('tells the page apart from the section that contains it', async () => {
    await at('/settings/profile');
    // Never two "current page" in one menu — the parent is a location, which a
    // screen reader announces as a different claim.
    expect(current('Profile')).toBe('page');
    expect(current('Settings')).toBe('location');
  });

  it('never announces two current pages in one menu', async () => {
    // The invariant, asserted over the whole menu rather than over the two
    // links a reviewer thought to name. TanStack's `Link` marks itself and its
    // `activeOptions` default to non-exact, so before the binding narrowed
    // that, BOTH `Settings` and `Profile` carried `aria-current="page"` — a
    // screen reader announcing "current page" twice, with nothing to tell the
    // two apart. Its attribute is spread last and beats anything passed in, so
    // no assertion on our own value could have seen this.
    await at('/settings/profile');
    const pages = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(pages.map((a) => a.textContent)).toEqual(['Profile']);
  });

  it('does not light up a neighbour that merely shares a prefix', async () => {
    await at('/teams');
    expect(current('Teams')).toBe('page');
    // `/team` is not an ancestor of `/teams`: the boundary is a segment.
    expect(current('Team')).toBe(null);
  });

  it('never reports a destination that leaves the app', async () => {
    // The trap this port sets: the design system asks about every link, and for
    // an external one it has nothing to ask, so it passes an empty href. Asked
    // naively, React Router resolves `''` to the CURRENT path and TanStack
    // matches it against the root — either way the menu claims the reader is on
    // another site.
    await at('/settings');
    expect(current('Elsewhere')).toBe(null);
    // …and it is still a working link, rendered by the browser and not routed.
    expect(link('Elsewhere')).toHaveAttribute(
      'href',
      'https://example.com/settings',
    );
  });

  it('keeps matching when the app is mounted under a prefix', async () => {
    // NOT presented as what a string comparison cannot do — that claim was
    // made here and measured false: `useLocation()` already reports the
    // pathname with the basename stripped, so the generic matcher handles this
    // too. It stays because a menu that goes dark under a basename is a real
    // regression and nothing else would catch it.
    await at('/settings', '/app');
    expect(current('Settings')).toBe('page');
    // The router also writes the prefix back into the href, which is what the
    // reader's status bar shows and what a middle-click opens.
    expect(link('Settings').getAttribute('href')).toContain('/app/settings');
  });

  it('renders an anchor that actually has a destination', async () => {
    // The port is `href` and both routers navigate on `to`. Handed the props
    // unchanged, each renders an anchor with NO href — a link that looks right,
    // is announced as a link, and goes nowhere.
    // The EXACT destination, not merely "an href": handed the props unchanged,
    // React Router's `Link` renders `href="/"` — truthy, present, and wrong.
    // The first version of this assertion asked only for truthy and survived
    // exactly that mutation.
    await at('/pricing');
    for (const [name, href] of [
      ['Settings', '/settings'],
      ['Profile', '/settings/profile'],
      ['Pricing', '/pricing'],
    ] as const) {
      expect(link(name).getAttribute('href'), name).toBe(href);
    }
  });
});
