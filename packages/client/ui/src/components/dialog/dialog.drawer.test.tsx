import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A DRAWER IS THE SAME MODAL, pinned to an edge — so what needs proving here is
 * geometry, and that pinning it broke none of the machinery the dialog suite
 * already proves. Geometry is the half no behavioural test can see: a bar
 * announced as horizontal once shipped drawn as a column, with eleven keyboard
 * tests passing over it.
 */
const drawer = (
  side: 'inline-start' | 'inline-end' | 'block-start' | 'block-end',
) => (
  <>
    <button type="button">Before</button>
    <Dialog>
      <DialogTrigger>Menu</DialogTrigger>
      <DialogContent side={side} aria-label="Navigation menu">
        <Nav label="Main" orientation="vertical">
          <NavLink href="#home">Home</NavLink>
          <NavGroup label="Products">
            <NavLink href="#tea">Tea</NavLink>
          </NavGroup>
        </Nav>
      </DialogContent>
    </Dialog>
    <p data-testid="page">Page behind</p>
  </>
);

const surface = () => document.querySelector('dialog') as HTMLDialogElement;

const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'Menu' }));
  await waitFor(() => expect(surface().open).toBe(true));
  // ARRIVED, not merely open: it slides in, so a rect read on the frame it
  // opens is a rect of a panel still off the edge it came from.
  await Promise.all(
    surface()
      .getAnimations()
      .map((a) => a.finished),
  );
  return surface().getBoundingClientRect();
};

describe('a dialog pinned to an edge', () => {
  it('meets three edges of the screen and leaves a strip of page', async () => {
    render(drawer('inline-start'));
    const box = await open();

    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.top)).toBe(0);
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    // Not the whole screen: what is left of the page is what says the drawer
    // is OVER something.
    expect(box.width).toBeLessThan(window.innerWidth);

    // It BORDERS ON ONE EDGE, the one facing the page. A box that keeps the
    // dialog's border and radius draws a hairline and two rounded corners
    // against the edge of the screen, which is the tell of a centred box
    // shoved sideways.
    const box2 = getComputedStyle(surface());
    expect(box2.borderInlineStartWidth).toBe('0px');
    expect(box2.borderBlockStartWidth).toBe('0px');
    expect(parseFloat(box2.borderInlineEndWidth)).toBeGreaterThan(0);
    expect(box2.borderRadius).toBe('0px');
  });

  it('pins to the other side when asked', async () => {
    render(drawer('inline-end'));
    const box = await open();
    expect(Math.round(box.right)).toBe(window.innerWidth);
    expect(box.left).toBeGreaterThan(0);
  });

  it('pins to the bottom, full width', async () => {
    render(drawer('block-end'));
    const box = await open();
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.width)).toBe(window.innerWidth);
    expect(box.height).toBeLessThan(window.innerHeight);
  });

  it('reads `inline-start` as the reader does', async () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'ar' } }}>
        {drawer('inline-start')}
      </UiProvider>,
    );
    const box = await open();

    // LOGICAL, which is the whole reason the prop is not called `left`: in
    // Arabic the inline start is the right-hand edge, and a drawer that opened
    // on the left there would be arriving from the end of the sentence.
    expect(Math.round(box.right)).toBe(window.innerWidth);
    expect(box.left).toBeGreaterThan(0);
  });

  it('slides in from the edge it is pinned to', async () => {
    render(drawer('inline-start'));
    await browser.click(screen.getByRole('button', { name: 'Menu' }));
    await waitFor(() => expect(surface().open).toBe(true));

    // It MOVES, not just fades: a panel that appears at the edge reads as a
    // layout change, and one that arrives from it reads as a drawer.
    const running = surface()
      .getAnimations()
      .map((a) => (a as CSSTransition).transitionProperty);
    expect(running).toContain('translate');
    await Promise.all(
      surface()
        .getAnimations()
        .map((a) => a.finished),
    );

    // …from the LEFT here, and from the right in Arabic. `inset-inline` is
    // logical on its own; `translate` is not, so the side it comes from is a
    // fact this stylesheet has to state — and one nothing else would catch,
    // because the panel ends up in the same place either way.
    expect(
      getComputedStyle(surface()).getPropertyValue('--from-x').trim(),
    ).toBe('-100%');
  });

  it('comes from the other edge in Arabic', async () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'ar' } }}>
        {drawer('inline-start')}
      </UiProvider>,
    );
    await open();
    expect(
      getComputedStyle(surface()).getPropertyValue('--from-x').trim(),
    ).toBe('100%');
  });

  it('is centred again with no side, which is a dialog', async () => {
    render(
      <Dialog>
        <DialogTrigger>Menu</DialogTrigger>
        <DialogContent aria-label="Plain">Content</DialogContent>
      </Dialog>,
    );
    const box = await open();
    // Neither edge — the UA's `margin: auto` still governs.
    expect(box.left).toBeGreaterThan(0);
    expect(box.top).toBeGreaterThan(0);
  });

  it('is still a modal, with everything that comes with one', async () => {
    render(drawer('inline-start'));
    await open();

    // The machinery the dialog suite proves, asked again HERE because pinning
    // a box is exactly the kind of change that quietly costs it.
    expect(surface().matches(':modal')).toBe(true);
    // On the ROOT and with `important`, which is where this package puts it —
    // a page rule of the consumer's would otherwise win and let the page
    // scroll behind the drawer.
    expect(document.documentElement.style.overflow).toBe('hidden');

    // INERT, asked the way a user would find out: the page behind cannot take
    // the focus while a modal is up.
    const behind = screen.getByRole('button', { name: 'Before' });
    behind.focus();
    expect(document.activeElement).not.toBe(behind);

    // The focus is inside, and Tab does not walk out of it.
    expect(surface().contains(document.activeElement)).toBe(true);
    await browser.keyboard('{Tab}{Tab}{Tab}{Tab}');
    expect(surface().contains(document.activeElement)).toBe(true);

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(surface().open).toBe(false));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Menu' }),
    );
  });

  it('carries the navigation it was opened for', async () => {
    render(drawer('inline-start'));
    await open();

    // The actual job: a vertical `Nav` on a small screen. It keeps its own
    // contract inside — Tab walks the links, a group opens in place.
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Products' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Products' })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
    expect(screen.getByRole('link', { name: 'Tea' })).toBeVisible();
  });

  describe('accessibility (axe)', () => {
    it('has no violations open', async () => {
      const { container } = renderUi(<main>{drawer('inline-start')}</main>);
      await open();
      await expectNoA11yViolations(container);
    });
  });
});
