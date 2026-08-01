import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogClose } from './dialog-close.component.js';

describe('DialogClose', () => {
  it('commands the dialog closed, declaratively', () => {
    render(
      <Dialog>
        <DialogContent>
          <DialogClose ref={createRef<HTMLButtonElement>()}>Cancel</DialogClose>
        </DialogContent>
      </Dialog>,
    );

    const close = screen.getByRole('button', { name: 'Cancel', hidden: true });
    const surface = screen.getByRole('dialog', { hidden: true });
    expect(close).toHaveAttribute('command', 'close');
    expect(close).toHaveAttribute('commandfor', surface.id);
  });
});
