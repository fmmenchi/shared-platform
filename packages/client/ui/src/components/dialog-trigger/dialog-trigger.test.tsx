import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from './dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';

describe('DialogTrigger', () => {
  it('commands the dialog declaratively, and says what will appear', () => {
    render(
      <Dialog>
        <DialogTrigger>Delete…</DialogTrigger>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Delete…' });
    const surface = screen.getByRole('dialog', { hidden: true });

    // The attribute IS the behaviour: no handler opens this.
    expect(trigger).toHaveAttribute('command', 'show-modal');
    expect(trigger).toHaveAttribute('commandfor', surface.id);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    // …and deliberately no `aria-expanded`: this trigger is INERT while the
    // dialog is open, so it would describe a state nobody can observe from it.
    expect(trigger).not.toHaveAttribute('aria-expanded');
  });

  it('forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Dialog>
        <DialogTrigger ref={ref}>Delete…</DialogTrigger>
        <DialogContent>content</DialogContent>
      </Dialog>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Delete…' }));
  });

  it('says so when it is used outside a Dialog', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DialogTrigger>Orphan</DialogTrigger>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('DialogTrigger: used outside a <Dialog>'),
    );
    warn.mockRestore();
  });
});
