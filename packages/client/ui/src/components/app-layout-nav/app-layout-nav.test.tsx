import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { AppLayout } from '../app-layout/app-layout.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { AppLayoutNav } from './app-layout-nav.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';

/**
 * THE TWO SLOTS, on the narrow side — this project's viewport is 414px, below
 * the `xl` container breakpoint, so the form here is always the drawer. The
 * column's turn is `app-layout-nav.desktop.test.tsx`.
 *
 * What has to be true is not "the right children show up" — a hidden element
 * would satisfy that, and hiding one is exactly the mistake this replaced. It
 * is that the other slot is NOT MOUNTED: its effects do not run, its ids do not
 * exist, and its state cannot diverge from anything.
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

describe('AppLayoutNav slots', () => {
  it('mounts the drawer slot and never the column one', async () => {
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

    await browser.click(screen.getByRole('button', { name: /menu/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());

    expect(screen.getByRole('link', { name: 'drawer' })).toBeVisible();
    // Not `toBeNull` on a query — the whole point is that it never ran at all,
    // which a `display: none` element would also pass the visibility check for.
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

    // The contents fall back; the container does not. A phone given one slot
    // gets the drawer holding it — not a 16rem rail across the screen.
    const trigger = screen.getByRole('button', { name: /menu/i });
    await browser.click(trigger);

    const dialog = await screen.findByRole('dialog');
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

    await browser.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toContainElement(
      screen.getByRole('link', { name: 'Loose' }),
    );
    // One copy of it, so a consumer's own id still resolves to the one on screen.
    expect(document.querySelectorAll('#loose-link')).toHaveLength(1);
  });

  it('ignores loose children once a slot is present', async () => {
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

    await browser.click(screen.getByRole('button', { name: /menu/i }));
    await screen.findByRole('dialog');

    // `waitFor`, because the dialog enters at `opacity: 0` and a bare
    // assertion here would be racing the animation, not testing the slot.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Slotted' })).toBeVisible(),
    );
    // Deliberate, and documented: mixing the two is ambiguous, and silently
    // rendering the stray one somewhere would be a worse answer than none.
    expect(document.querySelector('a[href="#stray"]')).toBeNull();
  });
});
