import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from './popover-content.component.js';

describe('PopoverContent', () => {
  it('is a dialog in the top layer, in the DOM before it is open', () => {
    render(
      <Popover>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );

    const surface = screen.getByRole('dialog', { hidden: true });
    expect(surface).toHaveAttribute('popover', 'auto');
    expect(surface.matches(':popover-open')).toBe(false);
  });

  it('forwards its ref to the element the platform acts on', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Popover>
        <PopoverContent ref={ref}>content</PopoverContent>
      </Popover>,
    );

    // The ref IS the programmatic API: `showPopover()`/`hidePopover()` are the
    // platform's, so the component offers no `open` prop to disagree with them.
    expect(ref.current).toBe(screen.getByRole('dialog', { hidden: true }));
    expect(typeof ref.current?.showPopover).toBe('function');
  });

  it('carries the surface’s border around its arrow', async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>content</PopoverContent>
      </Popover>,
    );
    await browser.click(screen.getByRole('button', { name: 'Share' }));

    const surface = screen.getByRole('dialog');
    const arrow = getComputedStyle(surface, '::after');
    const sides = [
      arrow.borderTopWidth,
      arrow.borderRightWidth,
      arrow.borderBottomWidth,
      arrow.borderLeftWidth,
    ].filter((width) => parseFloat(width) > 0);

    // Exactly the two edges that face out — the fill is opaque, so without them
    // the arrow punches a hole in the outline where it meets the box.
    expect(sides).toHaveLength(2);
    // …and in the surface's own colour, which Tailwind's `border` does NOT set:
    // it sets the width, and the colour falls back to `currentColor`.
    expect(arrow.borderTopColor).toBe(getComputedStyle(surface).borderTopColor);
  });

  it('says so when it is used outside a Popover', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<PopoverContent>Orphan</PopoverContent>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('PopoverContent: used outside a <Popover>'),
    );
    warn.mockRestore();
  });
});
