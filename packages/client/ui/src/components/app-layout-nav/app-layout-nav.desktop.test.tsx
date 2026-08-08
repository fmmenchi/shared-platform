import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { AppLayout } from '../app-layout/app-layout.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { AppLayoutNav } from './app-layout-nav.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * THE TWO SLOTS, on the wide side — the project whose browser is 1280px, above
 * the `xl` container breakpoint, so the form here settles on the column.
 *
 * It settles rather than starts there: nothing is rendered until `--nav-form`
 * has been read, which is why every assertion below waits. A test that read the
 * tree synchronously would be asserting an empty region.
 */
const shell = (children: React.ReactNode) => (
  <AppLayout>
    <AppLayoutNav label="Main">{children}</AppLayoutNav>
    <AppLayoutMain>
      <h1>Overview</h1>
    </AppLayoutMain>
  </AppLayout>
);

function Probe(props: { name: string; onMount: (name: string) => void }) {
  const { name, onMount } = props;
  useEffect(() => {
    onMount(name);
  }, [name, onMount]);
  return <a href={`#${name}`}>{name}</a>;
}

describe('AppLayoutNav slots, wide', () => {
  it('renders the column slot in the flow, with no trigger and no dialog', async () => {
    const mounted: string[] = [];
    render(
      shell(
        <>
          <AppLayoutNavColumn>
            <Probe name="column" onMount={(n) => mounted.push(n)} />
          </AppLayoutNavColumn>
          <AppLayoutNavDrawer>
            <Probe name="drawer" onMount={(n) => mounted.push(n)} />
          </AppLayoutNavDrawer>
        </>,
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'column' })).toBeVisible(),
    );

    // ONE entry. The version before this guessed `drawer` and corrected itself,
    // so the drawer's slot mounted first and was thrown away — and with a
    // single slot, or with loose children, the guess mounted the content that
    // actually ends up on screen, TWICE, on every wide load. Nothing is
    // rendered until the form is known, so there is nothing to throw away.
    expect(mounted).toEqual(['column']);
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('mounts loose children once, not once per form', async () => {
    const mounted: string[] = [];
    render(shell(<Probe name="loose" onMount={(n) => mounted.push(n)} />));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'loose' })).toBeVisible(),
    );

    // The shorthand the docs recommend for the simple case is the shape that
    // paid most for the old guess: the SAME content was mounted inside the
    // dialog and then again in the flow, so anything it fetched, it fetched
    // twice on every desktop page load.
    expect(mounted).toEqual(['loose']);
  });

  it('falls back to the drawer slot, but WITHOUT the drawer', async () => {
    render(
      shell(
        <AppLayoutNavDrawer>
          <a href="#only">Only</a>
        </AppLayoutNavDrawer>,
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Only' })).toBeVisible(),
    );

    // The container follows the FORM, not the slot that supplied the contents.
    // Otherwise a product that only ever described its drawer would find a
    // hamburger sitting on a 1280px screen.
    expect(document.querySelector('[data-region="nav"]')).toHaveAttribute(
      'data-form',
      'column',
    );
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('unmounts the drawer slot and mounts the column one across the breakpoint', async () => {
    const mounted: string[] = [];
    const unmounted: string[] = [];

    function Life(props: { name: string }) {
      const { name } = props;
      useEffect(() => {
        mounted.push(name);
        return () => void unmounted.push(name);
      }, [name]);
      return <a href={`#${name}`}>{name}</a>;
    }

    // Start below the breakpoint by squeezing the container, then let it go.
    // The shell is a container query, so the crossing is a width change on an
    // ancestor — no viewport trickery, and the same thing a tablet rotation is.
    const { container } = render(
      <div style={{ inlineSize: '20rem' }}>
        {shell(
          <>
            <AppLayoutNavColumn>
              <Life name="column" />
            </AppLayoutNavColumn>
            <AppLayoutNavDrawer>
              <Life name="drawer" />
            </AppLayoutNavDrawer>
          </>,
        )}
      </div>,
    );

    const box = container.firstElementChild as HTMLElement;
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /menu/i })).toBeVisible(),
    );

    box.style.inlineSize = '80rem';

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'column' })).toBeVisible(),
    );
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();

    // The swap leaves nothing of the old form behind: the drawer's slot is
    // unmounted, not hidden, which is the whole difference from the version
    // that let the stylesheet do it.
    expect(mounted).toEqual(['drawer', 'column']);
    expect(unmounted).toEqual(['drawer']);
    expect(document.querySelector('a[href="#drawer"]')).toBeNull();
  });

  it('keeps the focus in the navigation when the drawer becomes a column', async () => {
    const { container } = render(
      <div style={{ inlineSize: '20rem' }}>
        {shell(
          <>
            <AppLayoutNavColumn>
              <a href="#overview">Overview</a>
            </AppLayoutNavColumn>
            <AppLayoutNavDrawer>
              <a href="#settings">Settings</a>
            </AppLayoutNavDrawer>
          </>,
        )}
      </div>,
    );

    const box = container.firstElementChild as HTMLElement;
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /menu/i })).toBeVisible(),
    );
    await browser.click(screen.getByRole('button', { name: /menu/i }));
    await screen.findByRole('dialog');

    const inside = screen.getByRole('link', { name: 'Settings' });
    inside.focus();
    expect(document.activeElement).toBe(inside);

    box.style.inlineSize = '80rem';

    // A `<dialog>` REMOVED rather than closed fires no `close` event, so
    // `DialogContent`'s own restoration never runs and the focus falls to
    // `<body>`: rotate a tablet with the drawer open and the next Tab starts
    // again from the skip link. The region catches it and puts the reader at
    // the top of the navigation they were already standing in.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('link', { name: 'Overview' }),
      ),
    );
  });

  it('does not steal the focus when nothing in the region had it', async () => {
    const { container } = render(
      <div style={{ inlineSize: '20rem' }}>
        {shell(
          <AppLayoutNavColumn>
            <a href="#overview">Overview</a>
          </AppLayoutNavColumn>,
        )}
      </div>,
    );

    const box = container.firstElementChild as HTMLElement;
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /menu/i })).toBeVisible(),
    );

    const heading = screen.getByRole('heading', { name: 'Overview' });
    heading.tabIndex = -1;
    heading.focus();

    box.style.inlineSize = '80rem';

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Overview' })).toBeVisible(),
    );
    // The rescue is for focus the swap DESTROYS. A reader in the main content
    // is not to be dragged into the navigation because a window was resized.
    expect(document.activeElement).toBe(heading);
  });

  it('has no a11y violations in column form', async () => {
    const { container } = render(
      shell(
        <AppLayoutNavColumn>
          <Nav label="Main" orientation="vertical">
            <NavLink href="/overview" aria-current="page">
              Overview
            </NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </Nav>
        </AppLayoutNavColumn>,
      ),
    );

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Overview' })).toBeVisible(),
    );
    // The column's content is never rendered in any story-level axe run: the
    // storybook project has no viewport override and so runs narrow.
    await expectNoA11yViolations(container);
  });
});
