import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from './dialog-content.component.js';

// `closedby` is not in React's JSX types yet.
declare module 'react' {
  interface DialogHTMLAttributes<T> {
    closedby?: 'any' | 'closerequest' | 'none';
  }
}

describe('DialogContent', () => {
  it('is a native dialog, in the DOM and closed', () => {
    render(
      <Dialog>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog', { hidden: true });
    expect(surface.tagName).toBe('DIALOG');
    expect((surface as HTMLDialogElement).open).toBe(false);
  });

  it('forwards its ref to the element the platform acts on', () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Dialog>
        <DialogContent ref={ref}>content</DialogContent>
      </Dialog>,
    );
    // The ref IS the programmatic API — `showModal()` and `close()` are the
    // platform's, so there is no `open` prop to disagree with them.
    expect(typeof ref.current?.showModal).toBe('function');
  });

  it('locks the page behind it, against a page that says otherwise', async () => {
    // The page fights back, with the commonest rule there is. The lock used to
    // live in `@layer fmmenchi`, and an unlayered rule like this one beat it —
    // the modal opened over a page that still scrolled, in all three engines.
    const pageCss = document.createElement('style');
    pageCss.textContent = 'html { overflow-y: auto !important }';
    document.head.append(pageCss);

    const tall = document.createElement('div');
    tall.style.height = '3000px';
    document.body.append(tall);

    try {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>content</DialogContent>
        </Dialog>,
      );

      await browser.click(screen.getByRole('button', { name: 'Open' }));
      // The assertion is the CASCADE, not a scroll: `overflow: hidden` stops
      // the wheel and the keyboard, never `window.scrollBy` — measured, a
      // scripted scroll moves the page with the lock fully applied, so it
      // cannot be the check. What this pins is the thing that actually broke:
      // the rule used to live in a layer and lost to the page.
      expect(getComputedStyle(document.documentElement).overflowY).toBe(
        'hidden',
      );

      await browser.keyboard('{Escape}');
      // Released at the END of the exit, not at the key: the dialog is still
      // open — and still modal — while it fades, so the page underneath stays
      // frozen for exactly as long as there is something over it.
      await waitFor(() =>
        expect(getComputedStyle(document.documentElement).overflowY).toBe(
          'auto',
        ),
      );
    } finally {
      pageCss.remove();
      tall.remove();
    }
  });

  it('does NOT lock for a dialog that is not modal', async () => {
    const tall = document.createElement('div');
    tall.style.height = '3000px';
    document.body.append(tall);

    try {
      // `open` without `showModal()`: the page stays clickable and
      // keyboard-reachable, so freezing its scroll would trap the user with
      // nothing to dismiss. This is also what the server renders.
      render(
        <Dialog>
          <DialogContent open>content</DialogContent>
        </Dialog>,
      );
      expect(screen.getByRole('dialog').matches(':modal')).toBe(false);
      expect(document.documentElement.style.overflow).toBe('');
      expect(document.documentElement.dataset.fmScrollLock).toBeUndefined();
    } finally {
      tall.remove();
    }
  });

  it('lets the consumer refuse light dismiss', () => {
    // A modal holding an unfinished form must be able to keep a stray click on
    // the backdrop from throwing the typing away.
    render(
      <Dialog>
        <DialogContent closedby="closerequest">content</DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute(
      'closedby',
      'closerequest',
    );
  });

  it('keeps a name the consumer gave it', () => {
    render(
      <Dialog>
        <DialogContent aria-label="Consumer name">content</DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute(
      'aria-label',
      'Consumer name',
    );
  });

  it('says so when it is used outside a Dialog', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DialogContent>Orphan</DialogContent>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('DialogContent: used outside a <Dialog>'),
    );
    warn.mockRestore();
  });
  it('opens MODALLY at mount with `defaultOpen`, not merely `open`', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    // `open` alone would pass for a NON-modal dialog, which is what the
    // attribute gives and what this seed exists not to be.
    expect(surface.open).toBe(true);
    expect(surface.matches(':modal')).toBe(true);
  });

  it('is a SEED, not a control: it does not reopen after a close', async () => {
    const { rerender } = render(
      <Dialog defaultOpen>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    expect(surface.open).toBe(true);

    surface.close();
    expect(surface.open).toBe(false);

    // A re-render with the prop still true must not re-assert it — that is the
    // difference between a state initializer and a controlled `open`, and the
    // browser closes this dialog four ways that never ask React.
    rerender(
      <Dialog defaultOpen>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(surface.open).toBe(false);
  });

  it('stays closed without it', () => {
    render(
      <Dialog>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
  });
  it('opens and closes from the `open` prop', async () => {
    const noop = () => undefined;
    const { rerender } = render(
      <Dialog open={false} onOpenChange={noop}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog', {
      hidden: true,
    }) as HTMLDialogElement;
    expect(surface.open).toBe(false);

    rerender(
      <Dialog open onOpenChange={noop}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(surface.open).toBe(true);
    expect(surface.matches(':modal')).toBe(true);

    rerender(
      <Dialog open={false} onOpenChange={noop}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    // Opening is immediate and closing is not: the surface plays its exit
    // first, so the prop going false is a request that is granted at the end
    // of it rather than in the same frame.
    await waitFor(() => expect(surface.open).toBe(false));
  });

  it('grants a close the platform performs, even while `open` is true', async () => {
    // This replaces a test that asserted the opposite — that the prop "wins
    // back" a platform close, the way React snaps an `<input value>` back when
    // the consumer swallows the change. Measured what that means here: with
    // `open` still true, Escape closed the dialog and it reopened before the
    // next frame; a second Escape did the same; the focus never left. The user
    // could not get out — a keyboard trap (WCAG 2.1.2) built out of a consumer
    // bug that on an input would only have meant "you cannot type".
    //
    // So a close request is granted, and what an inattentive consumer gets is
    // a visible divergence — the dialog shut while their prop says open —
    // which they can see and fix, and which `onOpenChange` tells them about.
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    expect(surface.open).toBe(true);

    // What Escape, a backdrop click and `<form method="dialog">` all reach.
    surface.close();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(surface.open).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('opens again when the prop asks again', async () => {
    // The other half of granting the close: the consumer is still in charge,
    // so a NEW `true` reopens it. The effect runs on the prop's transitions,
    // never on the platform's, which is the whole distinction.
    const { rerender } = render(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    surface.close();

    rerender(
      <Dialog open={false} onOpenChange={() => undefined}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    rerender(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    await vi.waitFor(() => expect(surface.open).toBe(true));
    surface.close();
  });

  it('ignores `defaultOpen` while controlled — one writer, not two', () => {
    render(
      <Dialog open={false} defaultOpen onOpenChange={() => undefined}>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
  });

  it('warns when `open` arrives without `onOpenChange`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Dialog open>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`open` was given without `onOpenChange`'),
    );
    warn.mockRestore();
  });
});
