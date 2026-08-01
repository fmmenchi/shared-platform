import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
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
      expect(getComputedStyle(document.documentElement).overflowY).toBe('auto');
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
});
