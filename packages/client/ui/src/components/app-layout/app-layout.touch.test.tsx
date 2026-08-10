import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { AppLayout } from './app-layout.component.js';
import { AppLayoutNav } from '../app-layout-nav/app-layout-nav.component.js';
import { AppLayoutMain } from '../app-layout-main/app-layout-main.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

/**
 * The narrow form IS the touch form — it is the component's whole premise — and
 * it had no test in the project that reports a coarse pointer. The default
 * narrow project reports `pointer: fine`, so every target measured there is the
 * cursor's size while claiming to be the phone's.
 */
const shell = (
  <AppLayout>
    <header>Panel</header>
    <AppLayoutNav label="Main">
      <Nav label="Main" orientation="vertical">
        <NavLink href="#overview">Overview</NavLink>
        <NavLink href="#settings">Settings</NavLink>
      </Nav>
    </AppLayoutNav>
    <AppLayoutMain>
      <h1>Overview</h1>
    </AppLayoutMain>
  </AppLayout>
);

describe('AppLayout on a touch screen', () => {
  it('gives a finger the one control that opens the navigation', async () => {
    render(shell);
    const trigger = screen.getByRole('button', { name: /menu/i });

    // On a phone this button is the ONLY route to the navigation — there is no
    // rail to fall back to — so it is the one target that must not be short.
    expect(trigger.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it('opens a drawer whose rows a finger can hit', async () => {
    render(shell);
    await browser.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    await Promise.all(dialog.getAnimations().map((a) => a.finished));

    // Scoped to the drawer: the shell's own skip link is a link too, and it is
    // deliberately 1×1 until it has the focus.
    for (const link of within(dialog).getAllByRole('link')) {
      expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    // …and a way out that is not the backdrop, which is the only exit a phone
    // has otherwise: there is no `Escape` key.
    expect(
      screen.getByRole('button', { name: /close/i }).getBoundingClientRect()
        .height,
    ).toBeGreaterThanOrEqual(24);
  });
});
