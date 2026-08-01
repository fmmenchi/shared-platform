import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from './dialog-content.component.js';

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

  it('locks the page behind it, and lets it go again', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    const root = document.documentElement;

    await browser.click(screen.getByRole('button', { name: 'Open' }));
    // `showModal()` makes the page inert to clicks and keys but NOT to the
    // wheel — measured, it scrolled 300px in all three engines. One CSS rule
    // instead of the scroll-locking dependency every library takes.
    expect(getComputedStyle(root).overflow).toBe('hidden');

    await browser.keyboard('{Escape}');
    expect(getComputedStyle(root).overflow).not.toBe('hidden');
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
