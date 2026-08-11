import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Popover } from './popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverHeading } from '../popover-heading/popover-heading.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (onOpenChange?: (open: boolean) => void) => (
  <Popover onOpenChange={onOpenChange}>
    <PopoverTrigger>Share</PopoverTrigger>
    <PopoverContent>
      <PopoverHeading>Share this page</PopoverHeading>
      <a href="#somewhere">Copy link</a>
    </PopoverContent>
  </Popover>
);

describe('Popover', () => {
  it('adds no element of its own', () => {
    const { container } = render(example());
    // The root is wiring, not markup (ADR-0016): the first child is the
    // trigger, not a wrapper the layout has to account for.
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('opens from the trigger and takes the focus in', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Share' });

    await browser.click(trigger);
    const surface = screen.getByRole('dialog');
    expect(surface.matches(':popover-open')).toBe(true);
    // `autofocus` on the surface: the one piece of focus management the
    // platform does not do on its own.
    expect(document.activeElement).toBe(surface);
  });

  it('is dismissed the way the platform dismisses things', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Share' });

    await browser.click(trigger);
    await browser.keyboard('{Escape}');

    const surface = screen.getByRole('dialog', { hidden: true });
    expect(surface.matches(':popover-open')).toBe(false);
    // Not ours: `popover="auto"` returns the focus to the invoker. Measured
    // rather than assumed, because it is the reason there is no focus manager.
    expect(document.activeElement).toBe(trigger);
  });

  it('reports what the platform did, and never commands it', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    await browser.click(screen.getByRole('button', { name: 'Share' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('opens on its own when asked, and the trigger knows', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading>Share this page</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );

    const surface = screen.getByRole('dialog');
    await waitFor(() => expect(surface.matches(':popover-open')).toBe(true));

    // The second half is the one that had no test: the surface is opened by an
    // effect, so by the time anything subscribes to `toggle` the event has
    // already been and gone. Read the state or the trigger offers an expanded
    // surface as closed — which is exactly what a click landing before
    // hydration does, and this is the same shape.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
  });

  it('stops saying it is open when the surface is taken away', async () => {
    const Vanishing = () => {
      const [mounted, setMounted] = useState(true);
      return (
        <Popover>
          <PopoverTrigger>Share</PopoverTrigger>
          {mounted && (
            <PopoverContent>
              <PopoverHeading>Share this page</PopoverHeading>
              <button type="button" onClick={() => setMounted(false)}>
                drop
              </button>
            </PopoverContent>
          )}
        </Popover>
      );
    };
    render(<Vanishing />);
    const trigger = screen.getByRole('button', { name: 'Share' });

    await browser.click(trigger);
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );

    // Unmounted while open, nothing will ever fire `toggle` again — measured
    // before the mirror was shared with the menu, which had already fixed it:
    // the trigger went on offering an expanded surface that was not there.
    await browser.click(screen.getByRole('button', { name: 'drop' }));
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'false'),
    );
  });

  it('holds content a tooltip could never hold', async () => {
    render(example());
    await browser.click(screen.getByRole('button', { name: 'Share' }));

    // The difference between the two components, in one assertion: a link in
    // here is reachable, because the popover takes focus and a tooltip does not.
    const link = screen.getByRole('link', { name: 'Copy link' });
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(link);
  });

  describe('controlled by the app', () => {
    it('opens from its own trigger', async () => {
      // Measured before this: `popovertarget` opened the surface behind React's
      // back, the `toggle` reached a sync that still saw `open={false}`, and it
      // was hidden again inside the same frame — a controlled popover could not
      // be opened from its own trigger at all.
      const Controlled = () => {
        const [open, setOpen] = useState(false);
        return (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>Share</PopoverTrigger>
            <PopoverContent>
              <PopoverHeading>Share this page</PopoverHeading>
            </PopoverContent>
          </Popover>
        );
      };
      render(<Controlled />);

      await browser.click(screen.getByRole('button', { name: 'Share' }));
      await waitFor(() =>
        expect(screen.getByRole('dialog').matches(':popover-open')).toBe(true),
      );

      await browser.click(screen.getByRole('button', { name: 'Share' }));
      await waitFor(() =>
        expect(
          screen.getByRole('dialog', { hidden: true }).matches(':popover-open'),
        ).toBe(false),
      );
    });

    it('is still dismissable, whatever the prop says', async () => {
      // The consumer forgot to update their state. Measured before this: with
      // `open` true, Escape did not dismiss and neither did a click outside —
      // and because a light-dismiss popover CONSUMES that click, the page
      // behind was unusable while the surface sat there.
      render(
        <Popover open onOpenChange={() => undefined}>
          <PopoverTrigger>Share</PopoverTrigger>
          <PopoverContent>
            <PopoverHeading>Stuck?</PopoverHeading>
          </PopoverContent>
        </Popover>,
      );
      const surface = screen.getByRole('dialog');
      expect(surface.matches(':popover-open')).toBe(true);

      await browser.keyboard('{Escape}');
      await waitFor(() => expect(surface.matches(':popover-open')).toBe(false));
    });
  });

  it('keeps its name when one of two headings unmounts', async () => {
    // Found by extracting the heading the Dialog and the Popover had copied:
    // this one still cleared the registration unconditionally, so unmounting
    // either heading left the surface nameless with the other still on screen.
    const { rerender } = render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading key="first">First heading</PopoverHeading>
          <PopoverHeading key="second">Second heading</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );

    rerender(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading key="first">First heading</PopoverHeading>
        </PopoverContent>
      </Popover>,
    );

    await browser.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('First heading');
    await browser.keyboard('{Escape}');
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {example()}
          </main>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });

      it(`has no violations while OPEN — ${name}`, async () => {
        // The state the closed-only axe run never saw, and the one that
        // matters: the dialog, its name, the trigger's `aria-expanded`, and
        // the contrast of content on the card. Awaited past the entry fade —
        // axe measured mid-transition reports a contrast failure for opacity
        // that is on its way to 1, which is a measurement artefact and not a
        // criterion. A `<main>` for the same reason: axe's `region` rule flags
        // content outside a landmark, and a bare test page has none.
        const { container } = renderUi(
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {example()}
          </main>,
          { theme },
        );

        await browser.click(screen.getByRole('button', { name: 'Share' }));

        // NOT "is it open" — "has it ARRIVED". The sleep this replaced was
        // waiting out the entry transition, not the opening, and swapping in a
        // wait for `:popover-open` made the suite worse: axe ran while the
        // surface was still fading in and reported a contrast violation against
        // a half-transparent panel. So the condition is the transition being
        // over, and it is ENDED rather than waited out — no duration appears
        // here, which is the point.
        const surface = await waitFor(() => {
          const element = document.querySelector<HTMLElement>(
            '[popover]:popover-open',
          );
          expect(element).not.toBeNull();
          return element as HTMLElement;
        });
        for (const animation of surface.getAnimations()) animation.finish();
        await Promise.all(
          surface.getAnimations().map((animation) => animation.finished),
        );

        await expectNoA11yViolations(container);
      });
    }
  });

  it('focuses the surface when it opens at MOUNT, not only on click', async () => {
    // The autofocus attribute was written by the LAST effect while the
    // `defaultOpen` seed showed the surface in the same commit: the UA found
    // no attribute, focus stayed on <body>, and the mdx's promise — "the
    // dialog is focused and its name announced" — held only on the click
    // path. Effects run in declaration order; the attribute now lands first.
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Apri</PopoverTrigger>
        <PopoverContent>
          <PopoverHeading>Filtri</PopoverHeading>
          <p>contenuto</p>
        </PopoverContent>
      </Popover>,
    );
    const surface = screen.getByRole('dialog');
    await waitFor(() => {
      expect(surface).toHaveFocus();
    });
  });
});
