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
    const ref = createRef<HTMLDialogElement>();
    render(
      <Popover>
        <PopoverContent ref={ref}>content</PopoverContent>
      </Popover>,
    );

    // The ref IS the programmatic API: `showPopover()`/`hidePopover()` are the
    // platform's, so the component offers no `open` prop to disagree with them.
    // Typed as `HTMLDialogElement`, because the surface IS one.
    expect(ref.current).toBe(screen.getByRole('dialog', { hidden: true }));
    expect(typeof ref.current?.showPopover).toBe('function');
  });

  it('scrolls when the content is taller than the screen', async () => {
    render(
      <Popover>
        <PopoverTrigger>Share</PopoverTrigger>
        <PopoverContent>
          {Array.from({ length: 60 }, (_, row) => (
            <p key={row} style={{ height: '40px' }}>
              row {row}
            </p>
          ))}
        </PopoverContent>
      </Popover>,
    );
    await browser.click(screen.getByRole('button', { name: 'Share' }));

    const surface = screen.getByRole('dialog');
    surface.scrollTop = 200;
    // It is `position: fixed` in the top layer, so nothing else can bring the
    // bottom of it back: measured before this, 1549px of content — including
    // the only dismiss button — were painted below the viewport and reachable
    // by no scroll, no wheel and no key. That was the price of the arrow, and
    // the arrow is what went.
    expect(surface.scrollTop).toBe(200);
    expect(surface.scrollHeight).toBeGreaterThan(surface.clientHeight);
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
