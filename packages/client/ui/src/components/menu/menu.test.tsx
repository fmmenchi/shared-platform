import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (
  props: {
    onRename?: () => void;
    onOpenChange?: (open: boolean) => void;
  } = {},
) => (
  <Menu onOpenChange={props.onOpenChange}>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      <MenuItem onClick={props.onRename}>Rename</MenuItem>
      <MenuItem disabled>Duplicate</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  </Menu>
);

const item = (name: string) => screen.getByRole('menuitem', { name });
const open = () =>
  browser.click(screen.getByRole('button', { name: 'Actions' }));

describe('Menu', () => {
  it('adds no element of its own', () => {
    const { container } = render(example());
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('announces itself the way a menu button does', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await open();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('focuses the first item on open — the platform does not', async () => {
    render(example());
    await open();
    // Measured in all three engines before this existed: `popovertarget` opens
    // the surface and leaves the focus on the trigger, so a keyboard user could
    // not reach the menu at all.
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
  });

  it('is ONE tab stop: only the focused item is tabbable', async () => {
    render(example());
    await open();

    await waitFor(() =>
      expect(item('Rename')).toHaveAttribute('tabindex', '0'),
    );
    expect(item('Duplicate')).toHaveAttribute('tabindex', '-1');
    expect(item('Delete')).toHaveAttribute('tabindex', '-1');
  });

  it('moves with the arrows, skips what is disabled, and wraps', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Duplicate is disabled: the arrows step over it, and it stays in the DOM
    // so a screen reader still learns the command exists.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));

    // A menu is a ring.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));

    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('goes to the ends with Home and End', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{End}');
    expect(document.activeElement).toBe(item('Delete'));

    await browser.keyboard('{Home}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('leaves on Tab instead of walking through the items', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // What the platform does unaided — measured — is move focus to the next
    // item. A menu is one tab stop: Tab dismisses it.
    await browser.keyboard('{Tab}');
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('runs the command and closes', async () => {
    const onRename = vi.fn();
    render(example({ onRename }));
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{Enter}');
    expect(onRename).toHaveBeenCalledTimes(1);
    // Staying open would leave the user looking at a list of things they have
    // already done.
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('closes on Escape, and the focus goes back to the trigger', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('lets the pointer hand over to the keyboard', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Hovering makes an item the active one without stealing the focus, so the
    // next arrow continues from where the mouse is (APG).
    await browser.hover(item('Delete'));
    await waitFor(() =>
      expect(item('Delete')).toHaveAttribute('tabindex', '0'),
    );
    expect(item('Rename')).toHaveAttribute('tabindex', '-1');
  });

  it('reports what the platform did', async () => {
    const onOpenChange = vi.fn();
    render(example({ onOpenChange }));

    await open();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
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

        await open();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await expectNoA11yViolations(container);
        await browser.keyboard('{Escape}');
      });
    }
  });
});
