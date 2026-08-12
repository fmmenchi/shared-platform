import { describe, it, expect, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { AppLayout } from '../app-layout/app-layout.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { AppLayoutNav } from './app-layout-nav.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * THE TWO SLOTS, on the narrow side — this project's viewport is 414px, below
 * the `xl` container breakpoint, so the form here is always the drawer. The
 * column's turn is `app-layout-nav.desktop.test.tsx`.
 *
 * What has to be true is not "the right children show up" — a hidden element
 * would satisfy that, and hiding one is exactly the mistake this replaced. It
 * is that the other slot is NOT RENDERED: its effects do not run, its ids do
 * not exist, and its state cannot diverge from anything.
 */
const shell = (children: React.ReactNode) => (
  <AppLayout>
    <AppLayoutNav label="Main">{children}</AppLayoutNav>
    <AppLayoutMain>
      <h1>Overview</h1>
    </AppLayoutMain>
  </AppLayout>
);

/** A child that says how many times it has been MOUNTED, not rendered. */
function Probe(props: { name: string; onMount: (name: string) => void }) {
  const { name, onMount } = props;
  useEffect(() => {
    onMount(name);
  }, [name, onMount]);
  return <a href={`#${name}`}>{name}</a>;
}

const openDrawer = async () => {
  const trigger = screen.getByRole('button', { name: /menu/i });
  await browser.click(trigger);
  return screen.findByRole('dialog');
};

const spyWarn = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

describe('AppLayoutNav slots', () => {
  it('renders the drawer slot and never the column one', async () => {
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

    await openDrawer();

    // `waitFor`, because the drawer enters at `opacity: 0` and a bare
    // assertion here would be racing the animation, not testing the slot.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'drawer' })).toBeVisible(),
    );
    // Not `toBeNull` on a query alone — the point is that it never ran at all,
    // which a `display: none` element would also pass a visibility check for.
    // And ONE entry, not two: the form is read before anything is rendered, so
    // nothing is mounted into the wrong container first.
    expect(mounted).toEqual(['drawer']);
    expect(document.querySelector('a[href="#column"]')).toBeNull();
  });

  it('falls back to the column slot, INSIDE the drawer', async () => {
    render(
      shell(
        <AppLayoutNavColumn>
          <a href="#only">Only</a>
        </AppLayoutNavColumn>,
      ),
    );

    // The FORM first, asserted rather than assumed: the contents fall back, the
    // container does not. A phone given one slot gets the drawer holding it —
    // not a 16rem rail across the screen. This is the whole reason the slots
    // are content and not containers, so it is stated here, not left to whether
    // the next query happens to find a trigger.
    await waitFor(() =>
      expect(document.querySelector('[data-region="nav"]')).toHaveAttribute(
        'data-form',
        'drawer',
      ),
    );

    const dialog = await openDrawer();
    expect(dialog).toContainElement(screen.getByRole('link', { name: 'Only' }));
  });

  it('treats loose children as the navigation when no slot is given', async () => {
    render(
      shell(
        <a href="#loose" id="loose-link">
          Loose
        </a>,
      ),
    );

    const dialog = await openDrawer();
    expect(dialog).toContainElement(
      screen.getByRole('link', { name: 'Loose' }),
    );
    // One copy of it, so a consumer's own id still resolves to the one on screen.
    expect(document.querySelectorAll('#loose-link')).toHaveLength(1);
  });

  it('drops loose children once a slot is present, and SAYS so', async () => {
    const warn = spyWarn();
    render(
      shell(
        <>
          <AppLayoutNavDrawer>
            <a href="#slotted">Slotted</a>
          </AppLayoutNavDrawer>
          <a href="#stray">Stray</a>
        </>,
      ),
    );

    await openDrawer();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Slotted' })).toBeVisible(),
    );

    // Dropping them is deliberate — mixing the two is ambiguous. Dropping them
    // SILENTLY is what a consumer cannot debug, so the warning is the feature.
    expect(document.querySelector('a[href="#stray"]')).toBeNull();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('children beside a slot are dropped'),
      ),
    );
    warn.mockRestore();
  });

  it('warns and renders nothing when a slot is wrapped in a component', async () => {
    const warn = spyWarn();
    // The one shape no amount of walking can reach: `AppLayoutNav` sees an
    // element of type `Wrap`, and what is inside it does not exist until Wrap
    // renders. Before the warning this produced an empty navigation in both
    // forms with nothing said — the exact defect the fragment fix cured for
    // one shape only.
    const Wrap = () => (
      <AppLayoutNavDrawer>
        <a href="#wrapped">Wrapped</a>
      </AppLayoutNavDrawer>
    );

    render(shell(<Wrap />));
    await openDrawer();

    expect(document.querySelector('a[href="#wrapped"]')).toBeNull();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('AppLayoutNavDrawer was rendered'),
      ),
    );
    warn.mockRestore();
  });

  it('keeps the FIRST of a duplicated slot, and says so', async () => {
    const warn = spyWarn();
    render(
      shell(
        <>
          <AppLayoutNavDrawer>
            <a href="#first">First</a>
          </AppLayoutNavDrawer>
          <AppLayoutNavDrawer>
            <a href="#second">Second</a>
          </AppLayoutNavDrawer>
        </>,
      ),
    );

    await openDrawer();

    expect(screen.getByRole('link', { name: 'First' })).toBeInTheDocument();
    expect(document.querySelector('a[href="#second"]')).toBeNull();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('given more than once'),
      ),
    );
    warn.mockRestore();
  });

  it('treats an EMPTY slot as given, whichever way it is spelled empty', async () => {
    // `undefined` is the one that used to lie. It is a member of `ReactNode`,
    // so `{user ? <Nav/> : undefined}` type-checks and used to read as "slot
    // not given" — handing a logged-out phone the desktop rail it had asked
    // not to have. All five spellings now mean the same thing.
    const empties: React.ReactNode[] = [undefined, null, false, [], ''];

    for (const empty of empties) {
      const view = render(
        shell(
          <>
            <AppLayoutNavColumn>
              <a href="#col">Col</a>
            </AppLayoutNavColumn>
            <AppLayoutNavDrawer>{empty}</AppLayoutNavDrawer>
          </>,
        ),
      );

      await openDrawer();
      expect(document.querySelector('a[href="#col"]')).toBeNull();
      view.unmount();
    }
  });

  it('has no a11y violations with the drawer open', async () => {
    render(
      shell(
        <AppLayoutNavDrawer>
          <Nav label="Main" orientation="vertical">
            <NavLink href="/overview" aria-current="page">
              Overview
            </NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </Nav>
        </AppLayoutNavDrawer>,
      ),
    );

    const dialog = await openDrawer();
    // The DIALOG, not the whole container: an open modal makes the rest of the
    // page inert, so a page-wide scan reports the skip link as unfocusable —
    // which is what a modal is supposed to do, not a defect. What is being
    // scanned here is the slot's CONTENT, which the story-level axe pass
    // cannot reach: the storybook project runs narrow, so the drawer is shut
    // and its subtree is `display: none`.
    await expectNoA11yViolations(dialog);
  });
});
