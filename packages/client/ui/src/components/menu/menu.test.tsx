import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
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

  it('is named by its trigger', async () => {
    render(example());
    await open();
    // Measured before this: the trigger had no id, so `aria-labelledby`
    // resolved to nothing and the menu was announced as "menu". axe does not
    // catch it, which is why the assertion is here.
    expect(screen.getByRole('menu')).toHaveAccessibleName('Actions');
  });

  it('opens from the trigger’s arrows, at the end when asked', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });

    trigger.focus();
    await browser.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    await browser.keyboard('{Escape}');

    // ArrowUp opens at the LAST command (APG) — the only way to reach the end
    // of a long menu in one key.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await browser.keyboard('{ArrowUp}');
    await waitFor(() => expect(document.activeElement).toBe(item('Delete')));

    // …and the next open starts at the top again.
    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await browser.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
  });

  it('keeps the keyboard alive when no item can hold the focus', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem disabled>Rename</MenuItem>
          <MenuItem disabled>Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await open();

    // Measured before this: the focus stayed on the trigger, so the handler on
    // the surface never heard a key — the menu was open and the keyboard dead,
    // with `Tab` unable to close it either.
    const surface = screen.getByRole('menu');
    await waitFor(() => expect(document.activeElement).toBe(surface));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(surface);

    await browser.keyboard('{Tab}');
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('takes the focus back when the item holding it disappears', async () => {
    const Vanishing = () => {
      const [withSecond, setWithSecond] = useState(true);
      return (
        <>
          <Menu>
            <MenuTrigger>Actions</MenuTrigger>
            <MenuContent>
              <MenuItem>Rename</MenuItem>
              {withSecond && <MenuItem>Delete</MenuItem>}
            </MenuContent>
          </Menu>
          <button type="button" onClick={() => setWithSecond(false)}>
            drop
          </button>
        </>
      );
    };
    render(<Vanishing />);
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));

    // The item under the focus goes. The browser drops the focus on `<body>`,
    // and with the handler bound to the surface the whole menu went dead.
    screen.getByRole('button', { name: 'drop' }).click();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('menu')),
    );

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('lets the pointer hand over to the keyboard, for real', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Measured before this: the arrows read `document.activeElement` while the
    // hover wrote a separate state, so Down after a hover continued from the
    // OLD row. Hovering focuses now, which is one fact instead of two.
    await browser.hover(item('Delete'));
    await waitFor(() => expect(document.activeElement).toBe(item('Delete')));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('highlights exactly one row', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.hover(item('Delete'));
    // Two rules — `:hover` and `:focus-visible` — lit two rows at once, and lit
    // none at all when the menu was opened with the mouse. One attribute now
    // says which row is the one.
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('menuitem')
          .filter((row) => row.hasAttribute('data-active')),
      ).toHaveLength(1),
    );
    expect(item('Delete')).toHaveAttribute('data-active');
  });

  it('stops saying it is open when the menu is taken away', async () => {
    const Disappearing = () => {
      const [withMenu, setWithMenu] = useState(true);
      return (
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          {withMenu && (
            <MenuContent>
              <MenuItem>Rename</MenuItem>
            </MenuContent>
          )}
          <button type="button" onClick={() => setWithMenu(false)}>
            remove
          </button>
        </Menu>
      );
    };
    render(<Disappearing />);
    await open();
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Nothing will ever fire `toggle` again: without a report on unmount the
    // trigger announced a menu that no longer exists, permanently.
    screen.getByRole('button', { name: 'remove' }).click();
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'false'),
    );
  });

  it('walks up to the LAST item from something that is not an item', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <input aria-label="Filter" />
          <MenuItem>Rename</MenuItem>
          <MenuItem>Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await open();

    // `indexOf` returns -1 here, and the first version did arithmetic on that
    // -1: ArrowUp landed on the second-to-last item and skipped the end.
    screen.getByLabelText('Filter').focus();
    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('stays inside the viewport, however long it is', async () => {
    render(
      <div style={{ paddingTop: '45vh' }}>
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            {Array.from({ length: 40 }, (_, index) => (
              <MenuItem key={index}>Command {index}</MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </div>,
    );
    await open();

    // Measured before the geometry reported the room: a `100dvh` cap on a box
    // starting 447px down the screen ran 383px past the bottom edge, and the
    // surface is `fixed` in the top layer so no page scroll could reach it.
    const surface = screen.getByRole('menu').getBoundingClientRect();
    expect(surface.bottom).toBeLessThanOrEqual(window.innerHeight);

    await browser.keyboard('{End}');
    const last = (
      document.activeElement as HTMLElement
    ).getBoundingClientRect();
    // …and the command the keyboard lands on is one the user can see.
    expect(last.bottom).toBeLessThanOrEqual(window.innerHeight);
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
