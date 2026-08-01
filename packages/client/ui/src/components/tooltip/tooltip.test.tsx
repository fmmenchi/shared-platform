import { describe, it, expect, vi } from 'vitest';
import { createRef, forwardRef, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// The REAL pointer and the REAL keyboard, driven through the browser rather than
// dispatched at an element. Both are needed here: `user-event` sends a synthetic
// `pointerenter` straight to the node, which reported "hoverable" for a tooltip
// a real mouse could never reach, and its `Escape` is untrusted, so it cannot
// close a `<dialog>` — the very thing one test has to prove we do NOT do.
import { userEvent as browser } from '@vitest/browser/context';
import { Tooltip } from './tooltip.component.js';
import { TooltipProvider } from './tooltip.context.js';
import { Button } from '../button/button.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

// `hidden: true` on purpose: where the engine has the Popover API the UA keeps a
// closed popover at `display: none`, so the surface is out of the accessibility
// tree exactly when we want to assert that it is closed.
const surface = () => screen.getByRole('tooltip', { hidden: true });
const isOpen = () => surface().hasAttribute('data-open');

describe('Tooltip', () => {
  it('describes its trigger without renaming it', () => {
    render(
      <Tooltip content="Move to archive">
        <Button aria-label="Archive">A</Button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Archive' });
    // The NAME stays the trigger's; the tooltip is a description.
    expect(trigger).toHaveAccessibleName('Archive');
    expect(trigger).toHaveAccessibleDescription('Move to archive');
  });

  it('adds no element of its own around the trigger', () => {
    // ADR-0016: the trigger is cloned, not wrapped. A wrapper would break the
    // grid or flex layout the trigger sits in.
    const { container } = render(
      <Tooltip content="Hi">
        <Button>Trigger</Button>
      </Tooltip>,
    );
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('keeps the trigger’s own ref and description', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Tooltip content="Mine">
        <Button ref={ref} aria-describedby="theirs">
          T
        </Button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'T' });
    expect(ref.current).toBe(trigger);
    // Both survive: ours is appended, theirs is not replaced.
    expect(trigger.getAttribute('aria-describedby')).toMatch(/^theirs \S+$/);
  });

  it('describes a trigger that forwards nothing but its ref', async () => {
    // A component that takes the ref and picks the props it recognises is
    // ordinary, not broken — and the description used to vanish with it, in
    // silence, while the tooltip still opened.
    const RefOnly = forwardRef<HTMLButtonElement, { children?: ReactNode }>(
      (props, ref) => (
        <button ref={ref} aria-label="Archive">
          {props.children}
        </button>
      ),
    );
    RefOnly.displayName = 'RefOnly';

    render(
      <Tooltip content="Move to archive">
        <RefOnly>A</RefOnly>
      </Tooltip>,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Archive' }),
      ).toHaveAccessibleDescription('Move to archive'),
    );
  });

  it('opens on hover after the delay, and closes when the pointer leaves', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Delete" openDelay={0} closeDelay={0}>
        <Button aria-label="Delete">D</Button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Delete' });

    expect(isOpen()).toBe(false);
    await user.hover(trigger);
    await waitFor(() => expect(isOpen()).toBe(true));

    await user.unhover(trigger);
    await waitFor(() => expect(isOpen()).toBe(false));
  });

  it('opens on keyboard focus, immediately', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Save">
        <Button aria-label="Save">S</Button>
      </Tooltip>,
    );

    // No delay on focus — unlike a pointer sweeping a toolbar, focus arrives on
    // purpose. The default `openDelay` is 400ms, so a delayed path fails here.
    await user.tab();
    await waitFor(() => expect(isOpen()).toBe(true));
  });

  describe('WCAG 1.4.13 — content on hover or focus', () => {
    it('is DISMISSIBLE: Escape closes it and the focus does not move', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Delete">
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );
      const trigger = screen.getByRole('button', { name: 'Delete' });

      await user.tab();
      await waitFor(() => expect(isOpen()).toBe(true));

      await user.keyboard('{Escape}');
      await waitFor(() => expect(isOpen()).toBe(false));
      // The criterion is explicit: dismissing must not move the focus.
      expect(document.activeElement).toBe(trigger);
    });

    it('is HOVERABLE: it survives a REAL pointer travelling onto it', async () => {
      render(
        <Tooltip content="Delete this draft" openDelay={0} closeDelay={80}>
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );

      await browser.hover(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(isOpen()).toBe(true));

      // A real pointer, on purpose. Measured with a synthetic one this passed
      // while the tooltip vanished under an actual mouse: React's synthetic
      // `pointerenter` never fired for the trigger → surface crossing, so the
      // surface's listeners are native and this test is what proves it.
      await browser.hover(surface());
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(isOpen()).toBe(true);
    });

    it('is DISMISSIBLE before it even opens', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Delete" openDelay={200}>
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );

      await user.hover(screen.getByRole('button', { name: 'Delete' }));
      await user.keyboard('{Escape}');
      // An open that has been asked for is a thing to dismiss: without this the
      // tooltip appeared 200ms later, having been told not to.
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(isOpen()).toBe(false);
    });

    it('is PERSISTENT while the trigger keeps focus, pointer or no pointer', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Delete" closeDelay={0}>
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );
      const trigger = screen.getByRole('button', { name: 'Delete' });

      await user.tab();
      await waitFor(() => expect(isOpen()).toBe(true));

      // The mouse brushes past a trigger the keyboard opened. Closing here
      // would dismiss something the user never asked to dismiss.
      await user.hover(trigger);
      await user.unhover(trigger);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(isOpen()).toBe(true);
      expect(document.activeElement).toBe(trigger);
    });

    it('spends the Escape it uses: a surrounding dialog stays open', async () => {
      render(
        <dialog data-testid="dialog">
          <Tooltip content="Delete" openDelay={0}>
            <Button aria-label="Delete">D</Button>
          </Tooltip>
        </dialog>,
      );
      const dialog = screen.getByTestId('dialog') as HTMLDialogElement;
      dialog.showModal();

      await browser.hover(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(isOpen()).toBe(true));

      // A TRUSTED Escape, so the UA's own close-request behaviour is in play.
      // One keypress must dismiss one thing: measured, the tooltip used to take
      // the dialog down with it.
      await browser.keyboard('{Escape}');
      await waitFor(() => expect(isOpen()).toBe(false));
      expect(dialog.open).toBe(true);

      dialog.close();
    });

    it('is PERSISTENT: it does not time out on its own', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Delete" openDelay={0}>
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );

      await user.hover(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(isOpen()).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(isOpen()).toBe(true);
    });
  });

  it('points its arrow at the trigger, even when slid back into view', async () => {
    // The arrow is drawn from `--anchor-centre`, which is measured from the
    // FINAL coordinates — so `shift()` sliding the box away from the edge moves
    // the arrow the other way, and it still points at the control.
    const aim = async (padding: string) => {
      const { unmount } = render(
        <div style={{ padding }}>
          <Tooltip
            content="a label a good deal wider than its trigger"
            openDelay={0}
            closeDelay={9999}
          >
            <Button aria-label="T">T</Button>
          </Tooltip>
        </div>,
      );
      await browser.hover(screen.getByRole('button', { name: 'T' }));
      await waitFor(() => expect(isOpen()).toBe(true));

      const trigger = screen
        .getByRole('button', { name: 'T' })
        .getBoundingClientRect();
      const box = surface().getBoundingClientRect();
      const arrow = parseFloat(getComputedStyle(surface(), '::after').left);
      const miss = Math.abs(
        box.left + arrow - (trigger.left + trigger.width / 2),
      );
      const placement = surface().dataset.placement;
      unmount();
      return { miss, placement };
    };

    // Centred, then hard against the viewport edge where `shift()` has to move
    // the surface and the arrow must not move with it.
    expect((await aim('120px')).miss).toBeLessThan(1);
    const edge = await aim('120px 0 0 0');
    expect(edge.miss).toBeLessThan(1);
    expect(edge.placement).toBe('top');
  });

  it('aligns by writing direction, not by screen side', async () => {
    // `-start` is documented as logical, so it is measured: the same
    // `top-start` sits on the left in LTR and on the right in RTL.
    const side = async (dir: 'ltr' | 'rtl') => {
      const { unmount } = render(
        <div dir={dir} style={{ padding: '120px' }}>
          <Tooltip
            content="a tooltip wider than its trigger"
            placement="top-start"
            openDelay={0}
            closeDelay={9999}
          >
            <Button aria-label="T">TRIGGER</Button>
          </Tooltip>
        </div>,
      );
      await browser.hover(screen.getByRole('button', { name: 'T' }));
      await waitFor(() => expect(isOpen()).toBe(true));
      const trigger = screen
        .getByRole('button', { name: 'T' })
        .getBoundingClientRect();
      const tip = surface().getBoundingClientRect();
      const aligned =
        Math.abs(tip.left - trigger.left) < 2
          ? 'left'
          : Math.abs(tip.right - trigger.right) < 2
            ? 'right'
            : 'neither';
      unmount();
      return aligned;
    };

    expect(await side('ltr')).toBe('left');
    expect(await side('rtl')).toBe('right');
  });

  it('goes when the anchor is scrolled out of sight', async () => {
    // Nothing in the top layer is clipped, which is the point of it and also
    // the defect: measured, an anchor scrolled out of its `overflow: auto`
    // container left the tooltip painted in full over the content ABOVE that
    // container, pointing at a control the user could no longer see.
    render(
      <div>
        <div style={{ height: '250px' }} />
        <div
          data-testid="scroller"
          style={{ height: '150px', overflow: 'auto' }}
        >
          <div style={{ height: '80px' }} />
          <Tooltip content="Move to archive" openDelay={0} closeDelay={9999}>
            <Button aria-label="Archive">A</Button>
          </Tooltip>
          <div style={{ height: '1200px' }} />
        </div>
      </div>,
    );

    await browser.hover(screen.getByRole('button', { name: 'Archive' }));
    const surface = screen.getByRole('tooltip', { hidden: true });
    await waitFor(() => expect(isOpen()).toBe(true));
    expect(surface).not.toHaveAttribute('data-anchor-hidden');

    screen.getByTestId('scroller').scrollTop = 300;
    await waitFor(() => expect(surface).toHaveAttribute('data-anchor-hidden'));
    expect(getComputedStyle(surface).visibility).toBe('hidden');
  });

  it('closes on press, and the trigger’s own handler still runs', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Tooltip content="Open menu" openDelay={0}>
        <Button aria-label="Open menu" onClick={onClick}>
          M
        </Button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await user.hover(trigger);
    await waitFor(() => expect(isOpen()).toBe(true));

    await user.click(trigger);
    await waitFor(() => expect(isOpen()).toBe(false));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('the description resolves even while the tooltip is closed', () => {
    // The surface is always in the DOM: `aria-describedby` pointing at an
    // element that exists only while open is a description never read.
    render(
      <Tooltip content="Always readable">
        <Button aria-label="T">T</Button>
      </Tooltip>,
    );
    expect(
      screen.getByRole('button', { name: 'T' }),
    ).toHaveAccessibleDescription('Always readable');
  });

  describe('TooltipProvider — the tooltips of one set', () => {
    const pair = (
      <>
        <Tooltip content="Bold">
          <Button aria-label="Bold">B</Button>
        </Tooltip>
        <Tooltip content="Italic">
          <Button aria-label="Italic">I</Button>
        </Tooltip>
      </>
    );
    const openNow = () =>
      screen
        .getAllByRole('tooltip', { hidden: true })
        .filter((tip) => tip.hasAttribute('data-open'))
        .map((tip) => tip.textContent);

    it('opens the next one instantly, and only one at a time', async () => {
      render(<TooltipProvider>{pair}</TooltipProvider>);

      await browser.hover(screen.getByRole('button', { name: 'Bold' }));
      await waitFor(() => expect(openNow()).toEqual(['Bold']));

      // 60ms against a 400ms `openDelay`: having waited once, the user has said
      // they are reading labels. And the first is gone — two labels describing
      // two different buttons must never sit on screen together.
      await browser.hover(screen.getByRole('button', { name: 'Italic' }));
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(openNow()).toEqual(['Italic']);
    });

    it('changes nothing for a tooltip standing alone', async () => {
      render(pair);

      await browser.hover(screen.getByRole('button', { name: 'Bold' }));
      await waitFor(() => expect(openNow()).toEqual(['Bold']));

      await browser.hover(screen.getByRole('button', { name: 'Italic' }));
      await new Promise((resolve) => setTimeout(resolve, 60));
      // Still the first one, still waiting out the second's full delay: two
      // independent tooltips are not one another's business.
      expect(openNow()).toEqual(['Bold']);
    });
  });

  describe('says out loud what would otherwise fail in silence', () => {
    it('warns when the content only repeats the name', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Tooltip content="Archive">
          <Button aria-label="Archive">A</Button>
        </Tooltip>,
      );
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('twice')),
      );
      warn.mockRestore();
    });

    it('warns when the trigger swallows the ref, instead of doing nothing', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // A component that renders a button and forwards nothing. Without the
      // warning this compiles, renders, and silently does not exist.
      const Deaf = ({ children }: { children?: ReactNode }) => (
        <button>{children}</button>
      );
      render(
        <Tooltip content="Move to archive">
          <Deaf>A</Deaf>
        </Tooltip>,
      );
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('never received a ref'),
        ),
      );
      warn.mockRestore();
    });

    it('stays quiet when the tooltip describes rather than names', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Tooltip content="Move this draft to the archive">
          <Button aria-label="Archive">
            <img src="data:," alt="Archive" />
          </Button>
        </Tooltip>,
      );
      // The icon carries the name here, which a hand-rolled name computation
      // got wrong — measured — before this stopped guessing.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  it('says so by name when the trigger is not a single element', () => {
    // Otherwise it is a TypeError from inside cloneElement, which names nothing.
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() =>
      render(
        // @ts-expect-error the trigger must be one element
        <Tooltip content="x">plain text</Tooltip>,
      ),
    ).toThrow(/Tooltip: `children` must be a single element/);
    error.mockRestore();
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Tooltip content="Move to archive">
              <Button aria-label="Archive">A</Button>
            </Tooltip>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
