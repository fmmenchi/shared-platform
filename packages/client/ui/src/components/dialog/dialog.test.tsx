import { describe, it, expect, vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
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
    await browser.keyboard('{Escape}');

    // WebKit drops the focus on `<body>` ~60ms AFTER the close event — which is
    // why the repair is deferred, and why the first version never fired. The
    // condition is reproduced here rather than the engine: whoever holds the
    // focus lets it go, and the repair must notice.
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

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

    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('is dismissed by its close button', async () => {
    render(example());

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    await browser.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
  });

  it('reports what the platform did, and never commands it', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
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
