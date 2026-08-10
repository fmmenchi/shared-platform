import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverClose } from './popover-close.component.js';

describe('PopoverClose', () => {
  it('forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Popover>
        <PopoverContent>
          <PopoverClose ref={ref}>Done</PopoverClose>
        </PopoverContent>
      </Popover>,
    );
    expect(ref.current).toBe(
      screen.getByRole('button', { name: 'Done', hidden: true }),
    );
  });

  it('closes it, and the focus goes back to the trigger', async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Share' });
    await browser.click(trigger);
    const surface = screen.getByRole('dialog');
    expect(surface.matches(':popover-open')).toBe(true);

    // Declarative, like the trigger: `popovertargetaction="hide"`, no handler.
    // The focus returning is the platform's doing, and it is measured here
    // because it is the thing a hand-rolled popover always forgets.
    await browser.click(screen.getByRole('button', { name: 'Done' }));
    expect(surface.matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
