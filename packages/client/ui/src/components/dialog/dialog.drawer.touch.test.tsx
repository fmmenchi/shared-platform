import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';

/**
 * The touch form, in the browser that reports a coarse pointer at a phone's
 * viewport — which is the only place the claims a drawer makes are claims about
 * anything. Every geometry assertion in the sibling file is a DESKTOP
 * measurement at 414×896; this component exists for the screen below that.
 */
const drawer = (side: 'inline-start' | 'block-end') => (
  <Dialog>
    <DialogTrigger>Menu</DialogTrigger>
    <DialogContent side={side} aria-label="Navigation menu">
      <DialogClose>Close</DialogClose>
      <Nav label="Main" orientation="vertical">
        <NavLink href="#home">Home</NavLink>
        <NavLink href="#contact">Contact</NavLink>
      </Nav>
    </DialogContent>
  </Dialog>
);

const surface = () => document.querySelector('dialog') as HTMLDialogElement;

const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'Menu' }));
  await waitFor(() => expect(surface().open).toBe(true));
  await Promise.all(
    surface()
      .getAnimations()
      .map((a) => a.finished),
  );
  return surface().getBoundingClientRect();
};

describe('a drawer on a touch screen', () => {
  it('leaves a strip of page wide enough to be a target', async () => {
    render(drawer('inline-start'));
    const box = await open();

    // The backdrop IS the dismissal control here — there is no `Escape` key on
    // a phone — so the strip it occupies has to be reachable by a thumb, not
    // merely present.
    const strip = window.innerWidth - box.width;
    expect(strip).toBeGreaterThanOrEqual(44);
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
  });

  it('gives a finger something to hit inside it', async () => {
    render(drawer('inline-start'));
    await open();

    // Inherited rather than restated: the rows are `NavLink`s, which grow under
    // a coarse pointer. Inheriting is worth nothing unless it is checked.
    for (const row of screen.getAllByRole('link')) {
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }

    // The CLOSE CONTROL is a `Button`, and `Button` has no coarse-pointer rule
    // in this package — it measures 36px here. That clears WCAG 2.5.8 (AA
    // wants 24) and does NOT clear the 44 the platform guidelines ask for,
    // which the rows above do. Asserted at the standard the package actually
    // holds rather than one invented here, and written down because in a
    // drawer this control is the primary way out on a phone: there is no
    // `Escape` key, and the backdrop depends on `closedby`.
    expect(
      screen.getByRole('button', { name: 'Close' }).getBoundingClientRect()
        .height,
    ).toBeGreaterThanOrEqual(24);
  });

  it('leaves the bottom sheet room to be dismissed above it', async () => {
    render(drawer('block-end'));
    const box = await open();

    expect(Math.round(box.width)).toBe(window.innerWidth);
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    // Capped, so the backdrop above it is still a target.
    expect(window.innerHeight - box.height).toBeGreaterThanOrEqual(44);
  });
});
