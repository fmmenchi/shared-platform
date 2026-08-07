import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menubar } from './menubar.component.js';
import { Menu } from '../menu/menu.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const bar = (orientation?: 'horizontal' | 'vertical') => (
  <>
    <button type="button">Before</button>
    <Menubar label="Editor" orientation={orientation}>
      <Menu>
        <MenuItemTrigger>File</MenuItemTrigger>
        <MenuContent>
          <MenuItem>New</MenuItem>
          <Menu>
            <MenuItemTrigger>Open recent</MenuItemTrigger>
            <MenuContent>
              <MenuItem>report.pdf</MenuItem>
            </MenuContent>
          </Menu>
          <MenuItem>Save</MenuItem>
        </MenuContent>
      </Menu>
      <Menu>
        <MenuItemTrigger>Edit</MenuItemTrigger>
        <MenuContent>
          <MenuItem>Undo</MenuItem>
          <MenuItem>Copy link</MenuItem>
        </MenuContent>
      </Menu>
      <Menu>
        <MenuItemTrigger>View</MenuItemTrigger>
        <MenuContent>
          <MenuItem>Zoom in</MenuItem>
          <MenuItem>Zoom out</MenuItem>
        </MenuContent>
      </Menu>
    </Menubar>
    <button type="button">After</button>
  </>
);

const command = (name: string) => screen.getByRole('menuitem', { name });
const active = () => document.activeElement as HTMLElement;
const openedBy = (name: string) =>
  waitFor(() => expect(command(name)).toHaveAttribute('aria-expanded', 'true'));

describe('Menubar', () => {
  it('is a named bar of commands, each saying what it opens', () => {
    render(bar());
    const menubar = screen.getByRole('menubar', { name: 'Editor' });
    // Horizontal is what the role already means; only the other one is said.
    expect(menubar).not.toHaveAttribute('aria-orientation');

    for (const name of ['File', 'Edit', 'View']) {
      expect(command(name)).toHaveAttribute('aria-haspopup', 'menu');
      expect(command(name)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('is ONE tab stop, and remembers where the reader was', async () => {
    render(bar());
    screen.getByRole('button', { name: 'Before' }).focus();

    // In: the whole bar takes a single Tab, and hands it to the first command
    // rather than keeping it — a menubar is not somewhere to stand.
    await browser.keyboard('{Tab}');
    expect(active()).toBe(command('File'));

    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Edit'));

    // Out: Tab LEAVES, which is the difference from a navigation. It does not
    // walk the three commands.
    await browser.keyboard('{Tab}');
    expect(active()).toBe(screen.getByRole('button', { name: 'After' }));

    // And back in lands where the reader was, not at the start again.
    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(active()).toBe(command('Edit'));
  });

  it('walks the bar with the inline arrows, and wraps', async () => {
    render(bar());
    command('File').focus();

    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Edit'));
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('View'));
    // A bar is a ring: nobody holding the arrow hits a wall.
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('File'));
    await browser.keyboard('{ArrowLeft}');
    expect(active()).toBe(command('View'));

    await browser.keyboard('{Home}');
    expect(active()).toBe(command('File'));
    await browser.keyboard('{End}');
    expect(active()).toBe(command('View'));
  });

  it('opens a menu below the command, at either end', async () => {
    render(bar());
    command('File').focus();

    // Down at the first command, Up at the LAST — the only way to reach the end
    // of a long menu in one key.
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));

    await browser.keyboard('{Escape}');
    await waitFor(() =>
      expect(command('File')).toHaveAttribute('aria-expanded', 'false'),
    );
    // "Closes the menu and returns focus to the menubar item" (APG).
    expect(active()).toBe(command('File'));

    await browser.keyboard('{ArrowUp}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('Save')));
  });

  it('carries an open menu along the bar', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');

    // "Moves focus to the next item in the menubar and opens its menu" (APG) —
    // the reader is browsing the bar, not opening one menu at a time. The one
    // left behind goes without being told: an auto popover closes when another
    // opens.
    await browser.keyboard('{ArrowRight}');
    await openedBy('Edit');
    await waitFor(() =>
      expect(command('File')).toHaveAttribute('aria-expanded', 'false'),
    );
    await waitFor(() => expect(active()).toBe(command('Undo')));
  });

  it('leaves the arrows alone when the menu can use them', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');

    // Down and Up belong to the open menu, not to the bar underneath it.
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(command('Open recent'));
    expect(command('File')).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a submenu beside its command, and comes back to it', async () => {
    render(bar());
    command('File').focus();
    // One key at a time: the menu opens on a `toggle` the platform fires
    // asynchronously, and the focus reaches its first command with it — two
    // keystrokes sent together arrive while the trigger still has the focus.
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(command('Open recent'));

    // A submenu is BESIDE the command that opens it, so it is the inline arrow
    // that opens it — where the bar's own menu was opened from below.
    await browser.keyboard('{ArrowRight}');
    await openedBy('Open recent');
    await waitFor(() => expect(active()).toBe(command('report.pdf')));

    // And back is one level, to the command that led here — NOT along the bar,
    // which is what the same key does one level up.
    await browser.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(command('Open recent')).toHaveAttribute('aria-expanded', 'false'),
    );
    expect(active()).toBe(command('Open recent'));
    expect(command('File')).toHaveAttribute('aria-expanded', 'true');
  });

  it('is reached by typing, on the bar as much as in a menu', async () => {
    render(bar());
    command('File').focus();

    await browser.keyboard('v');
    expect(active()).toBe(command('View'));

    // …and the same buffer inside the menu it opens, where a space is part of
    // the search while the search still finds something.
    await browser.keyboard('{ArrowDown}');
    await openedBy('View');
    await browser.keyboard('zoom o');
    await waitFor(() => expect(active()).toBe(command('Zoom out')));
  });

  it('walks the other way in Arabic', async () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'ar' } }}>{bar()}</UiProvider>,
    );
    command('File').focus();

    // The bar runs the way the text does: the key that moves forward is the one
    // that points to where the next command IS.
    await browser.keyboard('{ArrowLeft}');
    expect(active()).toBe(command('Edit'));
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('File'));
  });

  describe('standing on its end', () => {
    it('is walked with the vertical arrows, and opens beside', async () => {
      render(bar('vertical'));
      expect(screen.getByRole('menubar')).toHaveAttribute(
        'aria-orientation',
        'vertical',
      );
      command('File').focus();

      await browser.keyboard('{ArrowDown}');
      expect(active()).toBe(command('Edit'));
      await browser.keyboard('{ArrowUp}');
      expect(active()).toBe(command('File'));

      // Beside, so the inline arrow opens it — the same key a submenu uses,
      // because it is the same geometry.
      await browser.keyboard('{ArrowRight}');
      await openedBy('File');
      await waitFor(() => expect(active()).toBe(command('New')));
    });
  });

  describe('accessibility (axe)', () => {
    it('has no violations with a menu open', async () => {
      const { container } = renderUi(<main>{bar()}</main>);
      await browser.click(command('File'));
      await openedBy('File');
      await expectNoA11yViolations(container);
    });
  });
});
