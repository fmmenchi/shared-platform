import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Menubar } from './menubar.component.js';
import { Menu } from '../menu/menu.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';

/**
 * The touch form. This file runs in its OWN browser — one reporting a coarse
 * pointer, on a phone's viewport — because that is the only way a media query
 * has anything to say, and because a bar of application menus on a 390px screen
 * is a real question rather than a smaller version of the desktop one.
 *
 * The bar inherits both answers rather than inventing them: its commands are
 * `MenuItemTrigger`s, which are menu rows, and its menus are `MenuContent`s,
 * which become sheets. Inheriting is only worth anything if it is checked.
 */
const bar = (
  <Menubar label="Editor">
    <Menu>
      <MenuItemTrigger>File</MenuItemTrigger>
      <MenuContent>
        <MenuItem>New</MenuItem>
        <MenuItem>Open…</MenuItem>
      </MenuContent>
    </Menu>
    <Menu>
      <MenuItemTrigger>Edit</MenuItemTrigger>
      <MenuContent>
        <MenuItem>Undo</MenuItem>
      </MenuContent>
    </Menu>
  </Menubar>
);

const command = (name: string) => screen.getByRole('menuitem', { name });

describe('Menubar on a touch screen', () => {
  it('gives a finger something to hit', async () => {
    render(bar);
    for (const name of ['File', 'Edit']) {
      expect(
        command(name).getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(44);
    }
  });

  it('keeps the bar on the screen it has', async () => {
    render(bar);
    const box = screen.getByRole('menubar').getBoundingClientRect();
    // It wraps rather than running off the edge — an application menu has more
    // words than a phone has width, and the alternative is commands nobody can
    // reach.
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    expect(command('Edit').getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
  });

  it('opens its menus as sheets, like every other menu here', async () => {
    render(bar);
    await browser.click(command('File'));
    await waitFor(() =>
      expect(command('File')).toHaveAttribute('aria-expanded', 'true'),
    );
    const surface = screen.getByRole('menu');
    await Promise.all(surface.getAnimations().map((a) => a.finished));

    // A dropdown pinned to its command sits under the thumb that opened it.
    // The bar does not ask for this — it comes from `MenuContent`, and that is
    // the point of the bar adding one part rather than a second machine.
    const box = surface.getBoundingClientRect();
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.width)).toBe(window.innerWidth);
  });

  it('offers no way back out of a menu it did not come from one', async () => {
    render(bar);
    await browser.click(command('File'));
    await waitFor(() =>
      expect(command('File')).toHaveAttribute('aria-expanded', 'true'),
    );

    // The "Back to …" row exists for a SUBMENU, whose parent stepped aside for
    // it on a small screen. A menu of the bar came from no menu, so a row
    // offering to return to one would be a lie — and it is `nested`, not "has a
    // family above it", that tells them apart. On touch it is also the only
    // place that distinction is visible.
    // Everywhere, including the menus that are closed: a count of commands
    // would pass for the wrong reason the moment the fixture changed.
    expect(
      screen.queryAllByRole('menuitem', { name: /back to/i, hidden: true }),
    ).toHaveLength(0);
  });
});
