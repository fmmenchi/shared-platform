import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppLayout } from '../app-layout/app-layout.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { AppLayoutNav } from './app-layout-nav.component.js';
import { AppLayoutNavColumn } from '../app-layout-nav-column/app-layout-nav-column.component.js';
import { AppLayoutNavDrawer } from '../app-layout-nav-drawer/app-layout-nav-drawer.component.js';

/**
 * THE TWO SLOTS, on the wide side — the project whose browser is 1280px, above
 * the `xl` container breakpoint, so the form here settles on the column.
 *
 * It settles rather than starts there: the form is `drawer` until the ref
 * callback reads `--nav-form` back, which is why every assertion below waits.
 * A test that read the tree synchronously would be asserting the first guess.
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
  it('mounts the column slot in the flow, with no trigger and no dialog', async () => {
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

    // The drawer's slot DID mount, once: the form starts at `drawer` and only
    // then reads `--nav-form` back, so on a wide screen the wrong slot lives
    // for exactly one commit. Pinned deliberately — if the initial guess ever
    // changes, this is the line that says so.
    expect(mounted).toEqual(['drawer', 'column']);
    // What matters is the resting state: nothing of the drawer is left.
    expect(document.querySelector('a[href="#drawer"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
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
});
