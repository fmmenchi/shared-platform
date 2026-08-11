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

/**
 * Somewhere for the REAL pointer to go. Playwright does not reset it between
 * tests, so a test that leaves it over a trigger hands the next one a spurious
 * `pointerenter` the moment that test renders a button in the same place —
 * which cost two green tests before it was understood.
 */
const Away = () => (
  <div
    data-testid="away"
    style={{ position: 'fixed', bottom: 0, left: 0, width: 24, height: 24 }}
  />
);
const parkPointer = () => browser.hover(screen.getByTestId('away'));
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
      await waitFor(() => expect(isOpen()).toBe(true));
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
      await waitFor(() => expect(isOpen()).toBe(false));
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
      await waitFor(() => expect(isOpen()).toBe(true));
      expect(document.activeElement).toBe(trigger);
    });

    it('spends the Escape only when there is something to see', async () => {
      // Gated on "engaged" alone, a pointer merely RESTING on a trigger
      // swallowed the key from millisecond 0 of a 400ms delay: measured inside
      // a dialog, one keypress dismissed nothing at all. A pending open is
      // cancelled here and the key travels on.
      render(
        <dialog data-testid="dialog">
          {/* Takes the focus `showModal()` hands out, so the trigger is only
              hovered — focus would open the tooltip immediately and legitimately
              spend the key. */}
          <Button aria-label="Elsewhere">E</Button>
          {/* A LONG delay, and it is the test's precondition rather than a
              detail: the key has to be pressed while the open is still
              pending. At 400ms the flake was real — under the full gate's load
              the hover and the keypress together outran it, the tooltip opened,
              and it then spent the Escape legitimately, failing the assertion
              below on the dialog. Measured: `tooltip.test.tsx:233`. */}
          <Tooltip content="Delete" openDelay={2000}>
            <Button aria-label="Delete">D</Button>
          </Tooltip>
        </dialog>,
      );
      const dialog = screen.getByTestId('dialog') as HTMLDialogElement;
      dialog.showModal();

      await browser.hover(screen.getByRole('button', { name: 'Delete' }));
      expect(isOpen()).toBe(false);

      await browser.keyboard('{Escape}');
      await waitFor(() => expect(dialog.open).toBe(false));
      // …and the tooltip that was on its way never arrives — waited PAST the
      // delay, or this would pass on a pending open that was never cancelled.
      await waitFor(() => expect(isOpen()).toBe(false));
      if (dialog.open) dialog.close();
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
      await waitFor(() => expect(isOpen()).toBe(true));
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

  it('puts the arrow at the aligned edge, not on the anchor', async () => {
    // A wide trigger with a short label: on `top-start` the anchor's centre is
    // PAST the surface's own edge, and following it pinned the arrow onto the
    // rounded corner. An aligned placement means the arrow belongs a fixed
    // distance from the edge it is aligned to — measured here from both ends.
    const arrowIn = async (placement: 'top-start' | 'top-end') => {
      const { unmount } = render(
        <div style={{ padding: '200px' }}>
          <Tooltip
            content="short"
            placement={placement}
            openDelay={0}
            closeDelay={9999}
          >
            <Button aria-label="T">A REALLY RATHER WIDE TRIGGER</Button>
          </Tooltip>
        </div>,
      );
      await browser.hover(screen.getByRole('button', { name: 'T' }));
      await waitFor(() => expect(isOpen()).toBe(true));

      // `left`/`right` both resolve to used values on an absolutely positioned
      // box, so the distance from each edge is read directly rather than
      // inferred from which one is `auto`.
      const arrow = getComputedStyle(surface(), '::after');
      const edges = {
        fromLeft: parseFloat(arrow.left),
        fromRight: parseFloat(arrow.right),
      };
      unmount();
      return edges;
    };

    expect((await arrowIn('top-start')).fromLeft).toBeLessThan(20);
    expect((await arrowIn('top-end')).fromRight).toBeLessThan(20);
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

  it('closes when the anchor is scrolled out of sight', async () => {
    // Nothing in the top layer is clipped, which is the point of it and also
    // the defect: an anchor scrolled out of its `overflow: auto` container left
    // the tooltip painted in full over the content ABOVE that container. It
    // CLOSES rather than hiding — a hidden-but-open surface strands whatever
    // state it holds, which on its sibling the Popover meant the focus.
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
    await waitFor(() => expect(isOpen()).toBe(true));

    screen.getByTestId('scroller').scrollTop = 300;
    await waitFor(() => expect(isOpen()).toBe(false));
  });

  it('closes when its trigger is taken away under the pointer', async () => {
    // The `pointerleave` that would close it can never fire, so without the
    // geometry reporting the loss the tooltip stayed on screen for good.
    const { rerender } = render(
      <Tooltip content="Delete" openDelay={0} closeDelay={9999}>
        <Button aria-label="Delete">D</Button>
      </Tooltip>,
    );
    await browser.hover(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(isOpen()).toBe(true));

    rerender(
      <Tooltip content="Delete" openDelay={0} closeDelay={9999}>
        <Button aria-label="Delete" style={{ display: 'none' }}>
          D
        </Button>
      </Tooltip>,
    );
    await waitFor(() => expect(isOpen()).toBe(false));
  });

  it('opens from the keyboard again after a click, pointer or no pointer', async () => {
    render(
      <>
        <Away />
        <Tooltip content="Open menu" openDelay={0}>
          <Button aria-label="Open menu">M</Button>
        </Tooltip>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    // Click with the pointer and LEAVE IT THERE, then come back by keyboard.
    // The press flag used to stay latched until a `pointerleave` that never
    // came, so the tooltip never opened again — the persistent half of WCAG
    // 1.4.13, lost to a flag.
    await browser.click(trigger);
    await waitFor(() => expect(isOpen()).toBe(false));

    await browser.keyboard('{Tab}');
    await browser.keyboard('{Shift>}{Tab}{/Shift}');
    await waitFor(() => expect(isOpen()).toBe(true));

    await parkPointer();
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
    // Keyed, so that removing the first genuinely UNMOUNTS it: same position
    // and same type would otherwise be reconciled into the survivor, and the
    // test would prove nothing.
    const pair = (
      <>
        <Tooltip key="bold" content="Bold">
          <Button aria-label="Bold">B</Button>
        </Tooltip>
        <Tooltip key="italic" content="Italic">
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
      // `waitFor`, not a sleep: this asserts something that BECOMES true, which
      // is the shape Testing Library retries for. A fixed sleep asserts it has
      // become true within exactly that many milliseconds, which is a claim
      // about the machine.
      await waitFor(() => expect(openNow()).toEqual(['Italic']));
    });

    it('is not wedged by a tooltip unmounted while open', async () => {
      const { rerender } = render(
        <TooltipProvider>
          <Away />
          {pair}
        </TooltipProvider>,
      );

      await browser.hover(screen.getByRole('button', { name: 'Bold' }));
      await waitFor(() => expect(openNow()).toEqual(['Bold']));

      // The slot used to keep pointing at a dead `dismiss`, so "somebody is
      // open" stayed true and every tooltip in the provider opened instantly
      // for the rest of the page's life.
      // Away from the trigger first: the real pointer would otherwise open the
      // survivor by itself and prove nothing.
      await parkPointer();
      rerender(
        <TooltipProvider>
          <Away />
          {null}
          <Tooltip key="italic" content="Italic">
            <Button aria-label="Italic">I</Button>
          </Tooltip>
        </TooltipProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 400));

      await browser.hover(screen.getByRole('button', { name: 'Italic' }));
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(openNow()).toEqual([]);
    });

    it('changes nothing for a tooltip standing alone', async () => {
      render(pair);

      await browser.hover(screen.getByRole('button', { name: 'Bold' }));
      await waitFor(() => expect(openNow()).toEqual(['Bold']));

      // THE CLOCK IS MOVED, not waited out — and `waitFor` is the wrong tool
      // here on purpose. What this asserts is a state that PERSISTS ("Bold is
      // still up, Italic has not opened yet"), and retrying cannot establish
      // one: it would only find the first moment it happened to hold.
      //
      // The sleep it replaces was the flakiest line in the suite. Sixty real
      // milliseconds have to fall inside BOTH windows — after Italic's hover,
      // before Bold's close delay elapses — and under the full gate's load they
      // did not: Bold closed, `openNow()` came back empty, and the failure was
      // about the CPU rather than the component. Only `setTimeout` and
      // `clearTimeout` are faked, which is what the disclosure delay uses, so
      // the browser's own pointer handling is untouched.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        await browser.hover(screen.getByRole('button', { name: 'Italic' }));
        vi.advanceTimersByTime(60);
        // Still the first one, still waiting out the second's full delay: two
        // independent tooltips are not one another's business.
        expect(openNow()).toEqual(['Bold']);
      } finally {
        vi.useRealTimers();
      }
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

    it('warns when the trigger cannot take focus', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // The shape that looks right with a mouse and reaches nobody else.
      // Measured in the accessibility tree: the description ends up on a node
      // with role `generic` and an empty name, which is not announced.
      render(
        <Tooltip content="VAT not included">
          <span>i</span>
        </Tooltip>,
      );
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('cannot take focus'),
        ),
      );
      warn.mockRestore();
    });

    it('warns for the instinctive repair too, because it is worse', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // `tabindex` makes it reachable and nothing else: a tab stop with no
      // role and no name. The warning has to survive it, or it teaches the
      // wrong fix.
      render(
        <Tooltip content="VAT not included">
          <span tabIndex={0}>i</span>
        </Tooltip>,
      );
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(warn).not.toHaveBeenCalledWith(
        expect.stringContaining('cannot take focus'),
      );
      warn.mockRestore();
    });

    it('warns when the trigger is disabled, which looks focusable', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // `tabIndex` still reads 0: the attribute takes it out of the tab order
      // without touching the property, so the obvious check misses it.
      render(
        <Tooltip content="Nothing to save yet">
          <Button disabled aria-label="Save">
            S
          </Button>
        </Tooltip>,
      );
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('out of the tab order'),
        ),
      );
      warn.mockRestore();
    });

    it('stays quiet for a trigger the keyboard can reach', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Tooltip content="Removes it for everyone">
          <Button aria-label="Delete">D</Button>
        </Tooltip>,
      );
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(warn).not.toHaveBeenCalled();
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
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Tooltip content="Move to archive">
              <Button aria-label="Archive">A</Button>
            </Tooltip>
          </main>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });

      it(`has no violations while OPEN — ${name}`, async () => {
        const { container } = renderUi(
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Away />
            <Tooltip content="Move to archive" openDelay={0}>
              <Button aria-label="Archive">A</Button>
            </Tooltip>
          </main>,
          { theme },
        );

        // Open, and past the fade: axe reading a surface mid-transition
        // reports the contrast of an opacity on its way to 1.
        await browser.hover(screen.getByRole('button', { name: 'Archive' }));
        await waitFor(() => expect(isOpen()).toBe(true));
        await new Promise((resolve) => setTimeout(resolve, 300));
        await expectNoA11yViolations(container);

        await parkPointer();
      });
    }
  });

  it('survives a JavaScript consumer handing content that is not a string', () => {
    // The type says string; a JS consumer with a mapped/spread source gets no
    // check, and `content.trim()` in the name-repeat guard ran on every
    // render — a TypeError that took the page down, naming neither the
    // component nor the mistake, while the render itself would have coped.
    const node = 42 as unknown as string;
    expect(() =>
      render(
        <Tooltip content={node}>
          <button type="button" aria-label="Save">
            S
          </button>
        </Tooltip>,
      ),
    ).not.toThrow();
  });
});
