import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Dialog } from './dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogHeading } from '../dialog-heading/dialog-heading.component.js';
import { DialogClose } from '../dialog-close/dialog-close.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (onOpenChange?: (open: boolean) => void) => (
  <Dialog onOpenChange={onOpenChange}>
    <DialogTrigger>Delete…</DialogTrigger>
    <DialogContent>
      <DialogHeading>Delete this draft?</DialogHeading>
      <p>It cannot be undone.</p>
      <DialogClose>Cancel</DialogClose>
    </DialogContent>
  </Dialog>
);

describe('Dialog', () => {
  it('adds no element of its own', () => {
    const { container } = render(example());
    // The root is wiring, not markup (ADR-0016).
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('opens modally from the trigger, named by its heading', async () => {
    render(example());

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const surface = screen.getByRole('dialog') as HTMLDialogElement;
    expect(surface.open).toBe(true);
    expect(surface).toHaveAccessibleName('Delete this draft?');
    // `showModal()` puts the focus inside; the platform picks the first
    // focusable, measured the same in all three engines.
    expect(surface.contains(document.activeElement)).toBe(true);
  });

  it('is dismissed by Escape, and the focus comes back', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Delete…' });

    await browser.click(trigger);
    await browser.keyboard('{Escape}');

    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('is dismissed by its close button', async () => {
    render(example());

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    await browser.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      (screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open,
    ).toBe(false);
  });

  it('reports what the platform did, and never commands it', async () => {
    const onOpenChange = vi.fn();
    render(example(onOpenChange));

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps the page behind it out of reach', async () => {
    render(
      <>
        <button type="button" data-testid="behind">
          Behind
        </button>
        {example()}
      </>,
    );

    await browser.click(screen.getByRole('button', { name: 'Delete…' }));
    const behind = screen.getByTestId('behind');

    // Six tabs, a full cycle and more. The ring is not the same in every
    // engine — measured, Chromium passes through `<body>` on its way round and
    // WebKit lands on the dialog itself — so what is asserted is the thing
    // that actually matters and holds everywhere: nothing outside is ever
    // reached. That is `showModal()`'s inert background, not ours.
    const visited: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      await browser.keyboard('{Tab}');
      visited.push(document.activeElement?.tagName ?? 'null');
      expect(document.activeElement).not.toBe(behind);
    }
    expect(visited).toHaveLength(6);

    await browser.keyboard('{Escape}');
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations while OPEN — ${name}`, async () => {
        const { container } = renderUi(
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {example()}
          </main>,
          { theme },
        );

        await browser.click(screen.getByRole('button', { name: 'Delete…' }));
        await new Promise((resolve) => setTimeout(resolve, 400));
        await expectNoA11yViolations(container);
        await browser.keyboard('{Escape}');
      });
    }
  });
});
