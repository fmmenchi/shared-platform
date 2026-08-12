import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogHeading } from './dialog-heading.component.js';

describe('DialogHeading', () => {
  it('names the dialog it is inside', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeading>Delete this draft?</DialogHeading>
        </DialogContent>
      </Dialog>,
    );

    // Opened first: a closed dialog is not rendered, and a name is not computed
    // for what is not rendered.
    await browser.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Delete this draft?',
    );
    await browser.keyboard('{Escape}');
  });

  it('takes the level the page needs, and forwards its ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Dialog>
        <DialogContent>
          <DialogHeading as="h3" ref={ref}>
            Nested
          </DialogHeading>
        </DialogContent>
      </Dialog>,
    );
    expect(ref.current?.tagName).toBe('H3');
  });
});
