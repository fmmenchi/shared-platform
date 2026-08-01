import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Popover } from './popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { PopoverHeading } from '../popover-heading/popover-heading.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (onOpenChange?: (open: boolean) => void) => (
  <Popover onOpenChange={onOpenChange}>
    <PopoverTrigger>Share</PopoverTrigger>
    <PopoverContent>
      <PopoverHeading>Share this page</PopoverHeading>
      <a href="#somewhere">Copy link</a>
    </PopoverContent>
  </Popover>
);

describe('Popover', () => {
  it('adds no element of its own', () => {
    const { container } = render(example());
    // The root is wiring, not markup (ADR-0016): the first child is the
    // trigger, not a wrapper the layout has to account for.
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('opens from the trigger and takes the focus in', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Share' });

    await browser.click(trigger);
    const surface = screen.getByRole('dialog');
    expect(surface.matches(':popover-open')).toBe(true);
    // `autofocus` on the surface: the one piece of focus management the
    // platform does not do on its own.
    expect(document.activeElement).toBe(surface);
  });

  it('is dismissed the way the platform dismisses things', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Share' });

    await browser.click(trigger);
    await browser.keyboard('{Escape}');

    const surface = screen.getByRole('dialog', { hidden: true });
    expect(surface.matches(':popover-open')).toBe(false);
    // Not ours: `popover="auto"` returns the focus to the invoker. Measured
    // rather than assumed, because it is the reason there is no focus manager.
    expect(document.activeElement).toBe(trigger);
  });

  it('reports what the platform did, and never commands it', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    await browser.click(screen.getByRole('button', { name: 'Share' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('holds content a tooltip could never hold', async () => {
    render(example());
    await browser.click(screen.getByRole('button', { name: 'Share' }));

    // The difference between the two components, in one assertion: a link in
    // here is reachable, because the popover takes focus and a tooltip does not.
    const link = screen.getByRole('link', { name: 'Copy link' });
    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(link);
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {example()}
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});
