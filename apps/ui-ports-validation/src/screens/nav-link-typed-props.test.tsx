import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav, NavLink, UiProvider } from '@fmmenchi/ui';
import type { LinkProps } from '@tanstack/react-router';

/**
 * The app keeps its router's OWN types, and the design system never learns
 * them.
 *
 * Extra props already reached the injected link — `NavLink` spreads what it
 * does not consume — so the only thing that stood between an app and
 * `<NavLink to="/orders/$id" params={{ id }} />` was TypeScript's permission.
 * `NavLinkExtraProps` is the hole the app fills, and this file fills it the
 * way an app would: once, with `Pick` of its router's real prop type, so the
 * names and the shapes are TanStack's rather than a copy of them that drifts.
 */
declare module '@fmmenchi/ui' {
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type,
     @typescript-eslint/no-empty-interface --
     This is the augmentation itself: the body is empty because everything it
     declares comes from the router's own prop type, which is the point. */
  interface NavLinkExtraProps extends Pick<
    LinkProps,
    'to' | 'params' | 'search' | 'hash'
  > {}
}

/** A stand-in for the router's link: it only has to receive the props. */
const SpyLink = ({
  to,
  hash,
  children,
  ...rest
}: {
  to?: unknown;
  hash?: unknown;
  children?: React.ReactNode;
} & Record<string, unknown>) => (
  <a
    href={typeof to === 'string' ? to : '/'}
    data-to={String(to)}
    data-hash={String(hash)}
    {...(rest as object)}
  >
    {children as React.ReactNode}
  </a>
);

describe('a router’s own props through NavLink', () => {
  it('accepts them, and delivers them to the injected link', () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, Link: SpyLink }}>
        <Nav label="Main">
          <NavLink to="/orders" hash="items">
            Orders
          </NavLink>
        </Nav>
      </UiProvider>,
    );
    const orders = screen.getByRole('link', { name: 'Orders' });
    // Runtime was never the problem — this asserts it stayed true, because a
    // `rest` that stopped being spread would make the augmentation a lie that
    // still typechecks.
    expect(orders).toHaveAttribute('data-to', '/orders');
    expect(orders).toHaveAttribute('data-hash', 'items');
  });

  it('still refuses a prop nobody declared', () => {
    // The hole is exactly as wide as the app opened it. Without this, an
    // augmentation of `Record<string, unknown>` would pass every assertion
    // above while turning the props into no contract at all.
    const bad = (
      <NavLink
        // @ts-expect-error `nonsense` is not an anchor prop, not a NavLink
        // prop, and not in what this app declared.
        nonsense="x"
      >
        Nope
      </NavLink>
    );
    expect(bad).toBeTruthy();
  });
});
