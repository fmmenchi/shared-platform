import { describe, it, expect, vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogHeading } from '../dialog-heading/dialog-heading.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (onOpenChange?: (open: boolean) => void) => (
  <Dialog onOpenChange={onOpenChange}>
    <DialogTrigger>Delete…</DialogTrigger>
    <DialogContent>
      <DialogHeading>Delete this draft?</DialogHeading>
      <p>It cannot be undone.</p>
      <DialogClose>Cancel</DialogClose>
    </DialogContent>
  </Dialog>
);

describe('Dialog', () => {
  it('does not report a close that never happened', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    // Reading the platform's state at mount is right; announcing it is not.
    // `onOpenChange(false)` at mount made a consumer's "discard the draft when
    // it closes" run before anything had opened.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('puts the focus back when the engine leaves it nowhere', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Delete…' });

    await browser.click(trigger);

    // WebKit drops the focus on `<body>` ~60ms AFTER the close event, which is
    // why the repair is deferred and why the first version never fired. The
    // ENGINE is not reproducible here, so the condition is: the focus is let go
    // at the moment of the close, before the deferred check runs.
    //
    // Attached to the event rather than awaited afterwards, deliberately —
    // blurring after `await` raced the repair's own timer and made this test
    // fail one run in three.
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    surface.addEventListener(
      'close',
      () => (document.activeElement as HTMLElement | null)?.blur(),
      { once: true },
    );

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger), {
      timeout: 1000,
    });
  });

  it('fades in — the machinery is not enough', async () => {
    render(example());
    const surface = screen.getByRole('dialog', { hidden: true });
    const seen: string[] = [];
    for (const type of ['transitionrun', 'transitionend']) {
      surface.addEventListener(type, () => seen.push(type));
    }

    // `@starting-style` shipped once saying `opacity: 1`, so the transition ran
    // from the value it ends at and nothing moved. Everything else about it was
    // in place, which is exactly why only an event can tell.
    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    await waitFor(() => expect(seen).toContain('transitionend'), {
      timeout: 1000,
    });
    expect(getComputedStyle(surface).opacity).toBe('1');

    await browser.keyboard('{Escape}');
  });

  it('adds no element of its own', () => {
    const { container } = render(example());
    // The root is wiring, not markup (ADR-0016).
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('opens modally from the trigger, named by its heading', async () => {
    render(example());

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    expect(surface.open).toBe(true);
    expect(surface).toHaveAccessibleName('Delete this draft?');
    // `showModal()` puts the focus inside; the platform picks the first
    // focusable, measured the same in all three engines.
    expect(surface.contains(document.activeElement)).toBe(true);
  });

  it('is dismissed by Escape, and the focus comes back', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Delete…' });

    await browser.click(trigger);
    await browser.keyboard('{Escape}');

    // `waitFor`, because the dismissal is GRANTED and then played: the surface
    // and its scrim fade before the dialog actually closes, so everything that
    // hangs off the `close` event — the focus coming back, the scroll lock
    // being released — happens at the end of the exit rather than at the key.
    await waitFor(() =>
      expect(
        (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement)
          .open,
      ).toBe(false),
    );
    expect(document.activeElement).toBe(trigger);
  });

  it('plays its way out, scrim and all', async () => {
    render(example());
    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;

    await browser.keyboard('{Escape}');

    // GRANTED, then performed. Measured in all three engines before this
    // existed: a closing `<dialog>` goes to `display: none`, and the CSS answer
    // — `transition-behavior: allow-discrete` — runs in Chromium alone, with
    // Gecko and WebKit reporting support for the property and then jumping
    // straight to `0/none`, no frames at all.
    expect(surface.open).toBe(true);
    const playing = surface.getAnimations({ subtree: true });
    expect(playing.length).toBeGreaterThan(0);

    // The scrim leaves with it: a modal that fades while its backdrop vanishes
    // on the first frame reads as broken, not as animated.
    expect(
      playing.some(
        (a) =>
          a.effect instanceof KeyframeEffect &&
          a.effect.pseudoElement === '::backdrop',
      ),
    ).toBe(true);

    await waitFor(() => expect(surface.open).toBe(false));
  });

  it('is never harder to close because it is leaving', async () => {
    render(example());
    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;

    await browser.keyboard('{Escape}');
    expect(surface.open).toBe(true);

    // Asked again while it is on the way out, the request is let THROUGH to
    // the platform rather than swallowed. There must be no state in which a
    // modal cannot be closed — an undismissable one is a keyboard trap, and an
    // animation is not a reason to introduce one.
    await browser.keyboard('{Escape}');
    expect(surface.open).toBe(false);
  });

  it('is dismissed by its close button', async () => {
    render(example());

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    await browser.click(screen.getByRole('button', { name: 'Cancel' }));

    // It leaves the same way Escape does. The button closes DECLARATIVELY —
    // `command="close"`, so it works before React has hydrated — and the
    // command event is cancelable in all three engines, which is what lets the
    // exit be played without giving that up: unhydrated, it simply closes at
    // once.
    expect(surface.open).toBe(true);
    expect(surface.getAnimations({ subtree: true }).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(
        (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement)
          .open,
      ).toBe(false),
    );
  });

  it('does not close a dialog that was asked for again while leaving', async () => {
    const noop = () => undefined;
    const controlled = (open: boolean) => (
      <Dialog open={open} onOpenChange={noop}>
        <DialogContent>
          <DialogHeading>Still here</DialogHeading>
        </DialogContent>
      </Dialog>
    );
    const { rerender } = render(controlled(true));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    await waitFor(() => expect(surface.open).toBe(true));

    // Out, and back in before it has finished leaving. The pending close has
    // to be called off: a dialog that shuts itself after its consumer asked
    // for it back is worse than one that does not animate at all.
    rerender(controlled(false));
    rerender(controlled(true));

    await waitFor(() => expect(surface.open).toBe(true));
  });

  it('reports what the platform did, and never commands it', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    // At the END of the exit: the consumer is told when the dialog has closed,
    // not when the user asked. Told at the key it would have to guess how long
    // the surface stays on screen.
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });

  it('keeps the page behind it out of reach', async () => {
    render(
      <>
        <button type="button" data-testid="behind">
          Behind
        </button>
        {example()}
      </>,
    );

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const behind = screen.getByTestId('behind');

    // Six tabs, a full cycle and more. The ring is not the same in every
    // engine — measured, Chromium passes through `<body>` on its way round and
    // WebKit lands on the dialog itself — so what is asserted is the thing
    // that actually matters and holds everywhere: nothing outside is ever
    // reached. That is `showModal()`'s inert background, not ours.
    const visited: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      await browser.keyboard('{Tab}');
      visited.push(document.activeElement?.tagName ?? 'null');
      expect(document.activeElement).not.toBe(behind);
    }
    expect(visited).toHaveLength(6);

    await browser.keyboard('{Escape}');
  });

  describe('controlled by the app', () => {
    it('opens from its own trigger', async () => {
      // Measured before this: the trigger's `command` opened the dialog behind
      // React's back, the `toggle` reached a sync that still saw `open={false}`
      // and it shut inside the same frame — a controlled dialog could not be
      // opened from its own trigger at all. While controlled the trigger ASKS.
      const Controlled = () => {
        const [open, setOpen] = useState(false);
        return (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>Delete…</DialogTrigger>
            <DialogContent>
              <DialogHeading>Delete this draft?</DialogHeading>
              <DialogClose>Cancel</DialogClose>
            </DialogContent>
          </Dialog>
        );
      };
      render(<Controlled />);

      await browser.click(screen.getByRole('button', { name: 'Delete…' }));
      await waitFor(() =>
        expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(
          true,
        ),
      );

      await browser.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(
          (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement)
            .open,
        ).toBe(false),
      );
    });

    it('lets the user out, whatever the prop says', async () => {
      // The consumer forgot to update their state. The dialog still closes:
      // an undismissable modal is a keyboard trap, and no amount of "the prop
      // is the source of truth" makes that acceptable.
      render(
        <Dialog open onOpenChange={() => undefined}>
          <DialogContent>
            <DialogHeading>Stuck?</DialogHeading>
            <button type="button">inside</button>
          </DialogContent>
        </Dialog>,
      );
      const surface = screen.getByRole('dialog') as HTMLDialogElement;
      expect(surface.open).toBe(true);

      await browser.keyboard('{Escape}');
      await waitFor(() => expect(surface.open).toBe(false));
    });
  });

  describe('says out loud what would otherwise fail in silence', () => {
    it('warns about a dialog with no name', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <p>No heading anywhere.</p>
          </DialogContent>
        </Dialog>,
      );

      // Neither a dev warning nor axe caught this before — the axe tests only
      // ever rendered WITH a heading, and a nameless dialog is announced as
      // "dialog" and nothing else.
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('no accessible name'),
        ),
      );
      warn.mockRestore();
    });

    it('warns when the trigger is not a button, which cannot command', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // Forwards the ref, like any well-behaved component — which is exactly
      // why the failure is silent: everything looks wired.
      const Anchor = (props: {
        children?: ReactNode;
        ref?: React.Ref<HTMLAnchorElement>;
      }) => (
        <a ref={props.ref} href="#x">
          {props.children}
        </a>
      );
      render(
        <Dialog>
          <DialogTrigger as={Anchor as never}>Open</DialogTrigger>
          <DialogContent>
            <DialogHeading>Named</DialogHeading>
          </DialogContent>
        </Dialog>,
      );

      // Silently dead, and only on browsers that HAVE invoker commands — so it
      // would pass a run on an older engine.
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('only works on a <button>'),
        ),
      );
      warn.mockRestore();
    });

    it('stays quiet when the dialog is named and the trigger is a button', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(example());
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('keeps the name when one of two headings unmounts', async () => {
      const { rerender } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeading key="first">First heading</DialogHeading>
            <DialogHeading key="second">Second heading</DialogHeading>
          </DialogContent>
        </Dialog>,
      );

      rerender(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeading key="first">First heading</DialogHeading>
          </DialogContent>
        </Dialog>,
      );

      // The cleanup used to clear the registration unconditionally, so the
      // dialog went nameless with a heading still on screen.
      await browser.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('dialog')).toHaveAccessibleName('First heading');
      await browser.keyboard('{Escape}');
    });
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations while OPEN — ${name}`, async () => {
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

        await browser.click(screen.getByRole('button', { name: 'Delete…' }));
        await new Promise((resolve) => setTimeout(resolve, 400));
        await expectNoA11yViolations(container);
        await browser.keyboard('{Escape}');
      });
    }
  });
});
