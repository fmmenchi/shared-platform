import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { Nav } from '../nav/nav.component.js';
import { NavLink } from '../nav-link/nav-link.component.js';
import { NavGroup } from '../nav-group/nav-group.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

type Side = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

/**
 * A DRAWER IS THE SAME MODAL pinned to an edge, so what needs proving is
 * geometry — the half no behavioural test can see, and the half an earlier
 * version of this file only pretended to cover: it measured ONE side, so the
 * same defect stayed alive on the other three, and it read a custom property
 * rather than where the panel actually starts, so a drawer sliding in on the
 * wrong axis passed.
 *
 * The instrument is the entry transition's FIRST KEYFRAME plus the resting
 * rect. The first says where the panel comes from, the second where it ends up,
 * and no mutation of one can be hidden by the other.
 */
const drawer = (side: Side, children?: React.ReactNode) => (
  // The entry transition is measured here, so it is made long enough that it
  // CANNOT end before the measurement, and then ended on purpose — see
  // `settle`. Slowing it alone was the previous attempt and it only moved the
  // odds: at 600ms the suite still failed under the full gate, because the gap
  // between the click resolving and the first poll is not bounded by anything.
  // Nothing here ever waits 5s; the transition is finished by hand the moment
  // it has been read.
  <div style={{ '--fm-duration-xs': '5s' } as React.CSSProperties}>
    <button type="button">Before</button>
    <Dialog>
      <DialogTrigger>Menu</DialogTrigger>
      <DialogContent side={side} aria-label="Navigation menu">
        <DialogClose>Close</DialogClose>
        {children ?? (
          <Nav label="Main" orientation="vertical">
            <NavLink href="#home">Home</NavLink>
            <NavGroup label="Products">
              <NavLink href="#tea">Tea</NavLink>
            </NavGroup>
          </Nav>
        )}
      </DialogContent>
    </Dialog>
    <p data-testid="page">Page behind</p>
  </div>
);

const surface = () => document.querySelector('dialog') as HTMLDialogElement;

/** Where the entry transition STARTS — the panel's own account of its edge. */
const comesFrom = () => {
  const slide = surface()
    .getAnimations()
    .find((a) => (a as CSSTransition).transitionProperty === 'translate');
  const effect = slide?.effect as KeyframeEffect | undefined;
  return String(effect?.getKeyframes()[0].translate ?? '').replace(/\s+/g, ' ');
};

/**
 * END the transitions rather than wait them out.
 *
 * This is the whole fix for a test that was flaky under the full gate and never
 * alone. Waiting for an animation to finish is waiting on the wall clock, and
 * the gap between a driven click resolving and the next poll is bounded by
 * nothing when fifteen other Nx targets are on the machine. `finish()` jumps
 * every running transition to its end state synchronously, so "arrived" becomes
 * a fact instead of a race — the same move as the menu's typeahead tests, which
 * moved the clock instead of sleeping through it.
 */
const settle = async () => {
  const running = surface().getAnimations();
  for (const animation of running) animation.finish();
  await Promise.all(running.map((animation) => animation.finished));
};

const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'Menu' }));
  await waitFor(() => expect(surface().open).toBe(true));

  // ARRIVED, not merely open: it slides, so a rect read while it is still
  // moving is the rect of a panel off the edge it came from. Nothing here waits
  // for the slide to EXIST — most of these tests only want the resting box, and
  // making them wait for a transient was what made the file flaky: one of them
  // renders its own `Dialog` without the slowed fixture, so it waited on a
  // transition that had already ended and failed on a machine under load.
  await settle();

  return {
    box: surface().getBoundingClientRect(),
    css: getComputedStyle(surface()),
  };
};

/**
 * Open, and read where the panel STARTED from.
 *
 * Separate from `open` because it is the one thing that needs the transition to
 * still be running, so it also needs the caller to have slowed it — which only
 * the `drawer()` fixture does. Asking for the direction is asking for that
 * contract; asking for the resting box is not.
 */
const openFrom = async () => {
  await browser.click(screen.getByRole('button', { name: 'Menu' }));
  await waitFor(() => expect(surface().open).toBe(true));
  await waitFor(() => expect(comesFrom()).not.toBe(''));
  const from = comesFrom();
  await settle();
  return { from, box: surface().getBoundingClientRect() };
};

const SIDES: Record<Side, { meets: string[]; borders: string; from: string }> =
  {
    'inline-start': {
      meets: ['left', 'top', 'bottom'],
      borders: 'borderInlineEndWidth',
      from: '-100%',
    },
    'inline-end': {
      meets: ['right', 'top', 'bottom'],
      borders: 'borderInlineStartWidth',
      from: '100%',
    },
    'block-start': {
      meets: ['top', 'left', 'right'],
      borders: 'borderBlockEndWidth',
      from: '0px -100%',
    },
    'block-end': {
      meets: ['bottom', 'left', 'right'],
      borders: 'borderBlockStartWidth',
      from: '0px 100%',
    },
  };

const BORDERS = [
  'borderInlineStartWidth',
  'borderInlineEndWidth',
  'borderBlockStartWidth',
  'borderBlockEndWidth',
] as const;

const gapAt = (box: DOMRect, edge: string) =>
  edge === 'right'
    ? window.innerWidth - box.right
    : edge === 'bottom'
      ? window.innerHeight - box.bottom
      : edge === 'left'
        ? box.left
        : box.top;

describe('a dialog pinned to an edge', () => {
  for (const side of Object.keys(SIDES) as Side[]) {
    describe(side, () => {
      it('meets three edges and borders on the fourth', async () => {
        render(drawer(side));
        const { box, css } = await open();

        for (const edge of SIDES[side].meets) {
          expect(Math.round(gapAt(box, edge))).toBe(0);
        }
        // A box that keeps the dialog's border and radius draws a hairline and
        // two rounded corners against the edge of the SCREEN — the tell of a
        // centred box shoved sideways.
        expect(css.borderRadius).toBe('0px');
        for (const edge of BORDERS) {
          if (edge === SIDES[side].borders) {
            expect(parseFloat(css[edge])).toBeGreaterThan(0);
          } else {
            expect(css[edge]).toBe('0px');
          }
        }
      });

      it('comes in from that same edge', async () => {
        render(drawer(side));
        const { from } = await openFrom();
        // The AXIS as well as the direction: reading a custom property proved
        // neither, and a drawer entering from the top passed.
        expect(from).toBe(SIDES[side].from);
      });
    });
  }

  it('leaves a real strip of page beside it', async () => {
    render(drawer('inline-start'));
    const { box } = await open();

    // The GAP, not `width < innerWidth`: dropping the width entirely gives the
    // centred dialog's own width, which is narrower than the viewport and
    // passed that inequality while leaving a 32px sliver.
    expect(window.innerWidth - box.width).toBeGreaterThanOrEqual(48);
  });

  it('caps the bottom sheet, and scrolls what will not fit', async () => {
    render(
      drawer(
        'block-end',
        <Nav label="Main" orientation="vertical">
          {Array.from({ length: 60 }, (_, index) => (
            <NavLink key={index} href={`#row-${index}`}>
              Row {index}
            </NavLink>
          ))}
        </Nav>,
      ),
    );
    const { box } = await open();

    // With two links the sheet measures its CONTENT, and any cap passes. This
    // is the content that makes the cap the thing being measured.
    expect(box.height).toBeCloseTo(window.innerHeight * 0.9, -1);
    expect(surface().scrollHeight).toBeGreaterThan(surface().clientHeight);
  });

  it('is centred again with no side, which is a dialog', async () => {
    render(
      <Dialog>
        <DialogTrigger>Menu</DialogTrigger>
        <DialogContent aria-label="Plain">Content</DialogContent>
      </Dialog>,
    );
    const { box } = await open();
    // CENTRED, not merely "not at the origin": equal gaps on both axes.
    expect(box.left).toBeCloseTo(window.innerWidth - box.right, 0);
    expect(box.top).toBeCloseTo(window.innerHeight - box.bottom, 0);
  });

  it('leaves the way it came, rather than shrinking off its edge', async () => {
    render(drawer('inline-start'));
    await open();

    await browser.keyboard('{Escape}');
    const leaving = surface()
      .getAnimations()
      .map((a) =>
        String(
          (a.effect as KeyframeEffect | undefined)?.getKeyframes().at(-1)
            ?.translate ?? '',
        ),
      );
    // The centred dialog's exit is a `scale(0.97)`, which on a pinned box pulls
    // away from all FOUR screen edges at once. Nothing in the entry rules
    // governs the exit — it is driven from JS, so it has to be told.
    expect(leaving.map((t) => t.replace(/\s+/g, ' '))).toContain('-100%');
    await waitFor(() => expect(surface().open).toBe(false));
  });

  describe('direction', () => {
    it('pins and arrives on the right in an rtl provider', async () => {
      render(
        <UiProvider adapters={{ i18n: { locale: 'ar' } }}>
          {drawer('inline-start')}
        </UiProvider>,
      );
      const { box, from } = await openFrom();
      expect(Math.round(box.right)).toBe(window.innerWidth);
      expect(from).toBe('100%');
    });

    it('follows the COMPUTED direction, not an attribute', async () => {
      // `dir="auto"` with Arabic content computes to rtl, and an attribute
      // selector does not match it — measured, the panel pinned to one edge and
      // arrived from the other, across the whole screen.
      render(
        <div dir="auto">
          مرحبا
          {drawer('inline-start')}
        </div>,
      );
      const { box, from } = await openFrom();
      expect(Math.round(box.right)).toBe(window.innerWidth);
      expect(from).toBe('100%');
    });

    it('follows an ltr island inside an rtl page', async () => {
      render(
        <div dir="rtl">
          <div dir="ltr">{drawer('inline-start')}</div>
        </div>,
      );
      const { box, from } = await openFrom();
      expect(Math.round(box.left)).toBe(0);
      expect(from).toBe('-100%');
    });
  });

  it('keeps the edge a consumer cannot take away', async () => {
    render(
      <Dialog>
        <DialogTrigger>Menu</DialogTrigger>
        <DialogContent
          side="inline-start"
          aria-label="Menu"
          {...({ 'data-side': 'nonsense' } as Record<string, string>)}
        >
          Content
        </DialogContent>
      </Dialog>,
    );
    await open();
    // After the spread on purpose, like `aria-labelledby` and `closedby`: the
    // hook the whole stylesheet keys off is not an opinion.
    expect(surface()).toHaveAttribute('data-side', 'inline-start');
  });

  it('is fixed to the viewport even with no modal to make it so', () => {
    // `<dialog open>` without `showModal()` — a path this component supports
    // deliberately. The UA only makes a MODAL dialog `fixed`, so without this
    // the drawer is glued to the document and scrolls away with the page.
    render(
      <Dialog>
        <DialogContent open side="inline-start" aria-label="Menu">
          Content
        </DialogContent>
      </Dialog>,
    );
    expect(getComputedStyle(surface()).position).toBe('fixed');
  });

  it('is still a modal, with everything that comes with one', async () => {
    render(drawer('inline-start'));
    await open();

    expect(surface().matches(':modal')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');

    const behind = screen.getByRole('button', { name: 'Before' });
    behind.focus();
    expect(document.activeElement).not.toBe(behind);

    expect(surface().contains(document.activeElement)).toBe(true);

    // TAB NEVER REACHES THE PAGE. Not "never leaves the dialog": measured, the
    // cycle passes through `<body>` for one step on the wrap, which is the
    // platform's own way round a modal and reaches nothing. What must never
    // happen is landing on a control behind it.
    for (let step = 0; step < 6; step++) {
      await browser.keyboard('{Tab}');
      const at = document.activeElement;
      expect(at === document.body || surface().contains(at)).toBe(true);
      expect(at).not.toBe(behind);
    }

    await browser.keyboard('{Escape}');
    await settle();
    await waitFor(() => expect(surface().open).toBe(false));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Menu' }),
    );
  });

  it('carries the navigation it was opened for, and a way out', async () => {
    render(drawer('inline-start'));
    await open();

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

    // A VISIBLE control, which the APG asks for and which on a phone is the
    // only one of the three exits that exists: there is no `Escape` key, and
    // the backdrop depends on `closedby`, which a consumer may switch off.
    await browser.click(screen.getByRole('button', { name: 'Close' }));
    await settle();
    await waitFor(() => expect(surface().open).toBe(false));
  });

  describe('accessibility (axe)', () => {
    it('has no violations open', async () => {
      const { container } = renderUi(<main>{drawer('inline-start')}</main>);
      await open();
      await expectNoA11yViolations(container);
    });
  });
});
