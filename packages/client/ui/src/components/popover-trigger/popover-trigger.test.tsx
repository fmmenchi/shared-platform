import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from './popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';

describe('PopoverTrigger', () => {
  it('forwards its ref to the element the surface anchors to', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Popover>
        <PopoverTrigger ref={ref}>Share</PopoverTrigger>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );
    // Merged with the context's own: the geometry needs this node, and so may
    // the consumer. Losing either is silent.
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Share' }));
  });

  it('targets the surface declaratively, and says what it will open', () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Share' });
    const surface = screen.getByRole('dialog', { hidden: true });

    // The toggle is the platform's: this attribute IS the behaviour, which is
    // why there is no click handler to test.
    expect(trigger).toHaveAttribute('popovertarget', surface.id);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('tells assistive tech the state the browser is keeping', async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByRole('button', { name: 'Share' });
    await browser.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await browser.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('says so when it is used outside a Popover', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<PopoverTrigger>Orphan</PopoverTrigger>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('PopoverTrigger: used outside a <Popover>'),
    );
    warn.mockRestore();
  });
});
